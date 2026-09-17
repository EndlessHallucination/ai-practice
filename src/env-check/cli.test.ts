import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { run } from "./cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "env-check-"));
});

afterEach(() => {
  // A chmod 0o000 file blocks recursive removal on some platforms, so restore
  // permissions before cleanup.
  for (const name of [".env", ".env.local"]) {
    try {
      chmodSync(join(dir, name), 0o600);
    } catch {
      // File may not exist in this test's dir; nothing to restore.
    }
  }
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

test("no variant files found prints a warning and exits 0", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe("Warning: no .env or .env.* files found\n");
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

test("an example key marked # optional is exempt from missing", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY= # optional\n");
  write(".env", "DATABASE_URL=postgres://localhost/dev\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(".env: OK\n");
});

test("an example key marked # optional is exempt from empty", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY= # optional\n");
  write(".env", "DATABASE_URL=postgres://localhost/dev\nAPI_KEY=\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(".env: OK\n");
});

test("a directory named .env is excluded from discovery, treated as no variant files found", () => {
  write(".env.example", "DATABASE_URL=\n");
  mkdirSync(join(dir, ".env"));
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe("Warning: no .env or .env.* files found\n");
});

test("a directory named .env is silently skipped while a real variant file is still reported", () => {
  write(".env.example", "DATABASE_URL=\n");
  mkdirSync(join(dir, ".env"));
  write(".env.local", "DATABASE_URL=postgres://localhost/dev\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(".env.local: OK\n");
});

test(".env.example being a directory reports a clean read error, not a crash", () => {
  mkdirSync(join(dir, ".env.example"));
  write(".env", "DATABASE_URL=x\n");
  const result = run(dir);
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("Error: could not read .env.example:");
});

test.skipIf(process.getuid?.() === 0)(
  "an unreadable .env reports permission denied, not a crash",
  () => {
    write(".env.example", "DATABASE_URL=\n");
    write(".env", "DATABASE_URL=x\n");
    chmodSync(join(dir, ".env"), 0o000);
    const result = run(dir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toBe("Error: could not read .env: permission denied\n");
  },
);

test("multiple variant files are each reported in their own section, in alphabetical order", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env.production", "DATABASE_URL=postgres://prod/db\n");
  write(".env", "DATABASE_URL=postgres://localhost/dev\n");
  write(".env.local", "DATABASE_URL=postgres://localhost/dev\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(
    [".env: OK", ".env.local: OK", ".env.production: OK", ""].join("\n"),
  );
});

test(".env.example is never treated as a variant to check against itself", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=postgres://localhost/dev\n");
  const result = run(dir);
  expect(result.output).not.toContain(".env.example:");
});

test("exit code is 1 if any file has a missing key, even if others are clean", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  write(".env", "DATABASE_URL=postgres://localhost/dev\nAPI_KEY=x\n");
  write(".env.local", "DATABASE_URL=postgres://localhost/dev\n");
  const result = run(dir);
  expect(result.exitCode).toBe(1);
  expect(result.output).toBe(
    [".env: OK", ".env.local:", "  MISSING: API_KEY", ""].join("\n"),
  );
});

test("a file with only extra/empty findings does not by itself force exit 1", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=postgres://localhost/dev\nDEBUG_MODE=1\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe([".env:", "  EXTRA: DEBUG_MODE", ""].join("\n"));
});

test.skipIf(process.getuid?.() === 0)(
  "one unreadable variant file reports its error and still reports the others",
  () => {
    write(".env.example", "DATABASE_URL=\n");
    write(".env", "DATABASE_URL=postgres://localhost/dev\n");
    write(".env.local", "DATABASE_URL=postgres://localhost/dev\n");
    chmodSync(join(dir, ".env.local"), 0o000);
    const result = run(dir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toBe(
      ".env: OK\nError: could not read .env.local: permission denied\n",
    );
  },
);
