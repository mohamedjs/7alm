import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { RealtimeGateway } from "./presentation/realtime.gateway";

@Module({ imports: [IdentityModule], providers: [RealtimeGateway] })
export class RealtimeModule {}
