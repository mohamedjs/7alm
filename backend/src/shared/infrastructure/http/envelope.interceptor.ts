import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, type Observable } from "rxjs";

export const SKIP_ENVELOPE = "skipEnvelope";
/** Return the handler's value as-is (plain-text webhook challenges, redirects, files). */
export const RawResponse = () => SetMetadata(SKIP_ENVELOPE, true);

/**
 * Keeps the v1 contract `{ success: true, data }` that RTK Query and n8n read.
 * A handler that already returns `{ success, ... }` is passed through.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE, [ctx.getHandler(), ctx.getClass()]);
    if (skip || ctx.getType() !== "http") return next.handle();
    return next.handle().pipe(
      map((value) => {
        if (value === undefined || value === null) return { success: true };
        if (typeof value === "object" && typeof (value as { success?: unknown }).success === "boolean") {
          return value;
        }
        return { success: true, data: value };
      }),
    );
  }
}
