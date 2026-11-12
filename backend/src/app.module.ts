import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { SharedModule } from "./shared/infrastructure/shared.module";
import { EnvelopeInterceptor } from "./shared/infrastructure/http/envelope.interceptor";
import { HttpExceptionFilter } from "./shared/infrastructure/http/http-exception.filter";
import { HealthController } from "./shared/presentation/health.controller";
import { loggerOptions } from "./shared/infrastructure/logging";
import { IdentityModule } from "./modules/identity";
import { CatalogModule } from "./modules/catalog";
import { GeoModule } from "./modules/geo";
import { CustomersModule } from "./modules/customers";
import { PromotionsModule } from "./modules/promotions";
import { ShippingModule } from "./modules/shipping";
import { OrderingModule } from "./modules/ordering";
import { ReviewsModule } from "./modules/reviews";
import { MessagingModule } from "./modules/messaging";
import { RealtimeModule } from "./modules/realtime";
import { SocialModule } from "./modules/social";
import { MediaModule } from "./modules/media";
import { AiStudioModule } from "./modules/ai-studio";
import { CrmModule } from "./modules/crm";

/** HTTP + WebSocket process. Every request-facing module is registered here. */
@Module({
  imports: [
    LoggerModule.forRoot(loggerOptions("api")),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 300 }]),
    SharedModule,
    IdentityModule,
    CatalogModule,
    GeoModule,
    CustomersModule,
    PromotionsModule,
    ShippingModule,
    OrderingModule,
    ReviewsModule,
    MessagingModule,
    RealtimeModule,
    SocialModule,
    MediaModule,
    AiStudioModule,
    CrmModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
