import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaUnitOfWork } from "./prisma/unit-of-work";
import { RedisService } from "./redis/redis.service";
import { RealtimeEmitter } from "./realtime/realtime-emitter.service";
import { CryptoService } from "./security/crypto.service";
import { UNIT_OF_WORK } from "../application/unit-of-work.port";
import { CLOCK, systemClock } from "../application/clock.port";
import { CACHE } from "../application/cache.port";
import { REALTIME } from "../application/realtime.port";
import { STORAGE } from "../application/storage.port";
import { LocalStorage } from "./storage/local-storage.service";

/** Kernel providers every module may inject. Kafka is worker-only (see WorkerModule). */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    RedisService,
    RealtimeEmitter,
    CryptoService,
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
    { provide: CLOCK, useValue: systemClock },
    { provide: CACHE, useExisting: RedisService },
    { provide: REALTIME, useExisting: RealtimeEmitter },
    { provide: STORAGE, useClass: LocalStorage },
  ],
  exports: [ConfigModule, PrismaService, RedisService, RealtimeEmitter, CryptoService, UNIT_OF_WORK, CLOCK, CACHE, REALTIME, STORAGE],
})
export class SharedModule {}
