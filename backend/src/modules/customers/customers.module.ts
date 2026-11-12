import { Module } from "@nestjs/common";
import { CustomersAdmin, CustomersFacade } from "./application/customers.use-cases";
import { CUSTOMER_STORE } from "./domain/customer";
import { CustomerRepository } from "./infrastructure/customer.repository";

/** Customer identity and CRM aggregates. HTTP endpoints live in the `crm` composition module. */
@Module({
  providers: [{ provide: CUSTOMER_STORE, useClass: CustomerRepository }, CustomersFacade, CustomersAdmin],
  exports: [CustomersFacade, CustomersAdmin],
})
export class CustomersModule {}
