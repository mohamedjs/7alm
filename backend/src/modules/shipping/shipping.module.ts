import { Module } from "@nestjs/common";
import { ShippingFacade } from "./application/shipping.facade";

@Module({ providers: [ShippingFacade], exports: [ShippingFacade] })
export class ShippingModule {}
