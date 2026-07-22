import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

@Module({
  imports: [CatalogModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
