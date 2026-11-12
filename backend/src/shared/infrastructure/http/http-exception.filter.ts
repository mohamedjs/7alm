import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { DomainError, type DomainErrorCode } from "../../domain/domain-error";

const STATUS: Record<DomainErrorCode, number> = {
  validation: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  forbidden: HttpStatus.FORBIDDEN,
  unauthorized: HttpStatus.UNAUTHORIZED,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
};

/** Every error leaves as `{ success: false, error }` with a fitting status code. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger("HttpError");

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== "http") throw exception;
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;

    if (exception instanceof DomainError) {
      res.status(STATUS[exception.code]).json({ success: false, error: exception.message });
      return;
    }
    if (exception instanceof ZodError) {
      const msg = exception.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
      res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: msg });
      return;
    }
    const prismaCode = (exception as { code?: unknown })?.code;
    if (prismaCode === "P2002") {
      const target = (exception as { meta?: { target?: unknown } }).meta?.target;
      res.status(HttpStatus.CONFLICT).json({ success: false, error: `Already exists${target ? `: ${String(target)}` : ""}` });
      return;
    }
    if (prismaCode === "P2025") {
      res.status(HttpStatus.NOT_FOUND).json({ success: false, error: "Not found" });
      return;
    }
    if (prismaCode === "P2003") {
      res.status(HttpStatus.CONFLICT).json({ success: false, error: "Still referenced by other records" });
      return;
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message).join("; ")
            : ((body as { message?: string }).message ?? exception.message);
      res.status(exception.getStatus()).json({ success: false, error: message });
      return;
    }
    this.log.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: "Internal server error" });
  }
}
