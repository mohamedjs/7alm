import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { CatalogModule } from "../catalog";
import { CustomersModule } from "../customers";
import { GeoModule } from "../geo";
import { PromotionsModule } from "../promotions";
import { ShippingModule } from "../shipping";
import { ChangeOrderStatusUseCase, OrderQueries, PlaceOrderUseCase } from "./application/ordering.use-cases";
import { ORDER_READS } from "./domain/order-details";
import { ORDER_STORE } from "./domain/ports";
import { OrderRepository } from "./infrastructure/order.repository";
import { OrdersController, OrdersN8nController, OrderWebhooksController } from "./presentation/ordering.controllers";

@Module({
  imports: [IdentityModule, CatalogModule, CustomersModule, GeoModule, PromotionsModule, ShippingModule],
  controllers: [OrdersController, OrdersN8nController, OrderWebhooksController],
  providers: [
    OrderRepository,
    { provide: ORDER_STORE, useExisting: OrderRepository },
    { provide: ORDER_READS, useExisting: OrderRepository },
    PlaceOrderUseCase,
    ChangeOrderStatusUseCase,
    OrderQueries,
  ],
  exports: [OrderQueries],
})
export class OrderingModule {}
