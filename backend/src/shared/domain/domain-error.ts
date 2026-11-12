/**
 * Errors raised by domain and application code. They carry no HTTP or
 * framework knowledge; `presentation` maps them to status codes.
 */
export type DomainErrorCode =
  | "validation"
  | "not_found"
  | "conflict"
  | "forbidden"
  | "unauthorized"
  | "unavailable";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }

  static validation(message: string) {
    return new DomainError("validation", message);
  }
  static notFound(message: string) {
    return new DomainError("not_found", message);
  }
  static conflict(message: string) {
    return new DomainError("conflict", message);
  }
  static forbidden(message: string) {
    return new DomainError("forbidden", message);
  }
  static unauthorized(message: string) {
    return new DomainError("unauthorized", message);
  }
  static unavailable(message: string) {
    return new DomainError("unavailable", message);
  }
}
