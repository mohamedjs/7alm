import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { CatalogModule } from "../catalog";
import { CustomersModule } from "../customers";
import { ReviewsFacade, ReviewsUseCases } from "./application/reviews.use-cases";
import { REVIEW_STORE } from "./domain/review";
import { ReviewRepository } from "./infrastructure/review.repository";
import { ReviewsAdminController, ReviewsController } from "./presentation/reviews.controllers";

@Module({
  imports: [IdentityModule, CatalogModule, CustomersModule],
  controllers: [ReviewsController, ReviewsAdminController],
  providers: [{ provide: REVIEW_STORE, useClass: ReviewRepository }, ReviewsFacade, ReviewsUseCases],
  exports: [ReviewsFacade],
})
export class ReviewsModule {}
