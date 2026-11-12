import { PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** `@Body(new ZodPipe(schema))` — parses and narrows request input. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}
