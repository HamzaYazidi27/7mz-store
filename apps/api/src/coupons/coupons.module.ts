import { Global, Module } from "@nestjs/common";
import { CouponsService } from "./coupons.service";

@Global()
@Module({
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
