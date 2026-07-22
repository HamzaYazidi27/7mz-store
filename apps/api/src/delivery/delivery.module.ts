import { Global, Module } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";

@Global()
@Module({
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
