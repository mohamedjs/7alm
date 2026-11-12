import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Modular-monolith rules, checked on every test run:
 *  1. A module is reached only through its index.ts (no deep imports into another module).
 *  2. Domain code imports nothing from Nest, Prisma, Kafka, Redis, HTTP or the generated client.
 *  3. Only infrastructure/ (and shared/infrastructure) imports Prisma.
 */
const SRC = path.resolve(__dirname, "../src");
const MODULES = path.join(SRC, "modules");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f);
    if (statSync(full).isDirectory()) return f === "__fixtures__" ? [] : files(full);
    return f.endsWith(".ts") && !f.endsWith(".spec.ts") ? [full] : [];
  });
}

const imports = (file: string) => [...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
const moduleOf = (file: string) => path.relative(MODULES, file).split(path.sep)[0];

describe("architecture", () => {
  const all = files(MODULES);

  it("modules import each other only through index.ts", () => {
    const violations: string[] = [];
    for (const file of all) {
      for (const spec of imports(file).filter((s) => s.startsWith("."))) {
        const target = path.resolve(path.dirname(file), spec);
        if (!target.startsWith(MODULES + path.sep)) continue;
        const targetModule = path.relative(MODULES, target).split(path.sep);
        if (targetModule[0] !== moduleOf(file) && targetModule.length > 1) {
          violations.push(`${path.relative(SRC, file)} → ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("domain layers are framework-free", () => {
    const banned = /^(@nestjs|@prisma|kafkajs|ioredis|socket\.io|express)|generated\/prisma|\/infrastructure\//;
    const violations = all
      .filter((f) => f.includes(`${path.sep}domain${path.sep}`))
      .flatMap((f) => imports(f).filter((s) => banned.test(s)).map((s) => `${path.relative(SRC, f)} → ${s}`));
    expect(violations).toEqual([]);
  });

  it("only infrastructure touches Prisma", () => {
    const violations = all
      .filter((f) => !f.includes(`${path.sep}infrastructure${path.sep}`))
      .flatMap((f) => imports(f).filter((s) => /prisma\.service|generated\/prisma|@prisma\//.test(s)).map((s) => `${path.relative(SRC, f)} → ${s}`));
    expect(violations).toEqual([]);
  });
});
