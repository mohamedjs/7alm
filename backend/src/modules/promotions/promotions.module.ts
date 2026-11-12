import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { CustomersModule } from "../customers";
import { PromotionsAdmin, PromotionsFacade } from "./application/promotions.use-cases";
import { COUPON_STORE } from "./domain/coupon";
import { CouponRepository } from "./infrastructure/coupon.repository";
import { CouponsAdminController, CouponsPublicController } from "./presentation/promotions.controllers";

@Module({
  imports: [IdentityModule, CustomersModule],
  controllers: [CouponsPublicController, CouponsAdminController],
  providers: [{ provide: COUPON_STORE, useClass: CouponRepository }, PromotionsFacade, PromotionsAdmin],
  exports: [PromotionsFacade],
})
export class PromotionsModule {}
