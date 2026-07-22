import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { PAYMENT_PROVIDERS, type PaymentProviderCode } from "@7mz/shared";
import { Public } from "../common/decorators/public.decorator";
import { PaymentsService } from "./payments.service";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Provider webhook receiver. Raw body is preserved (see main.ts) so adapters
   * can verify signatures. One route per provider keeps verification isolated.
   */
  @Public()
  @Post("webhook/:provider")
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async webhook(
    @Param("provider") providerParam: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ) {
    const provider = providerParam as PaymentProviderCode;
    if (!PAYMENT_PROVIDERS.includes(provider)) {
      return { ok: false };
    }
    await this.payments.handleWebhook(provider, {
      rawBody: req.rawBody ?? JSON.stringify(body ?? {}),
      headers,
      body,
    });
    return { ok: true };
  }
}
