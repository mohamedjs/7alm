import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { AiStudioUseCases } from "./application/ai-studio.use-cases";
import { AiStudioRepository } from "./infrastructure/ai-studio.repository";
import { OpenRouterClient } from "./infrastructure/openrouter.client";
import { AiStudioAdminController, AiStudioN8nController, OpenRouterWebhookController } from "./presentation/ai-studio.controllers";

@Module({
  imports: [IdentityModule],
  controllers: [AiStudioAdminController, AiStudioN8nController, OpenRouterWebhookController],
  providers: [AiStudioRepository, OpenRouterClient, AiStudioUseCases],
})
export class AiStudioModule {}
