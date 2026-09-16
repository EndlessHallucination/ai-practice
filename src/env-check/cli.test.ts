import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { run } from "./cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "env-check-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, content: string): void {
  writeFileSync(join(dir, name), content);
}

test("missing .env.example is a hard error", () => {
  writeFileSync(join(dir, ".env"), "PORT=3000\n");
  const result = run(dir);
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain(".env.example not found");
});

test("missing .env is reported specifically, not as every key missing", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  const result = run(dir);
  expect(result.exitCode).toBe(1);
  expect(result.output).toBe("Error: .env not found\n");
  expect(result.output).not.toContain("DATABASE_URL");
  expect(result.output).not.toContain("API_KEY");
});

test("clean pair reports OK and exits 0", () => {
  write(".env.example", "DATABASE_URL=\nPORT=\n");
  write(".env", "DATABASE_URL=postgres://localhost/dev\nPORT=3000\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(".env: OK\n");
});

test("reports missing, empty, and extra together and exits 1 because missing is present", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\nPORT=\n");
  write(".env", "API_KEY=\nPORT=3000\nDEBUG_MODE=1\n");
  const result = run(dir);
  expect(result.exitCode).toBe(1);
  expect(result.output).toBe(
    [".env:", "  MISSING: DATABASE_URL", "  EMPTY: API_KEY", "  EXTRA: DEBUG_MODE", ""].join(
      "\n",
    ),
  );
});

test("a bare key with no equals sign reports EMPTY, not MISSING", () => {
  write(".env.example", "API_KEY=\n");
  write(".env", "API_KEY\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe([".env:", "  EMPTY: API_KEY", ""].join("\n"));
});

test("never prints actual values from .env", () => {
  write(".env.example", "DATABASE_URL=\nPORT=\n");
  write(".env", "DATABASE_URL=super-secret-value-xyz\nPORT=3000\n");
  const result = run(dir);
  expect(result.output).not.toContain("super-secret-value-xyz");
});
