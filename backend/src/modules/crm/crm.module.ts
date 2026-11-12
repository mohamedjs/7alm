import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { CustomersModule } from "../customers";
import { OrderingModule } from "../ordering";
import { CrmUseCases } from "./application/crm.use-cases";
import { EvolutionWhatsApp } from "./infrastructure/evolution-whatsapp";
import { CustomersAdminController, EvolutionWebhookController } from "./presentation/crm.controllers";

@Module({
  imports: [IdentityModule, CustomersModule, OrderingModule],
  controllers: [CustomersAdminController, EvolutionWebhookController],
  providers: [EvolutionWhatsApp, CrmUseCases],
})
export class CrmModule {}
