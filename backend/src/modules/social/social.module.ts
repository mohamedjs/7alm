import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { SocialConnections } from "./application/social.use-cases";
import { SocialRepository } from "./infrastructure/social.repository";
import { ConnectionsAdminController, ConnectionsCallbackController } from "./presentation/social.controllers";

@Module({
  imports: [IdentityModule],
  controllers: [ConnectionsAdminController, ConnectionsCallbackController],
  providers: [SocialRepository, SocialConnections],
})
export class SocialModule {}
