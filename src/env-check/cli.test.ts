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

test("a clean file after a failing file does not reset the exit code", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\nPORT=\n");
  write(".env", "DATABASE_URL=x\n"),
    write(".env.local", "DATABASE_URL=x\nAPI_KEY=y\nPORT=80\n"),
    write(".env.production", "DATABASE_URL=x\nAPI_KEY=y\nPORT=80\n");
  const result = run(dir)
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("MISSING: API_KEY");

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

// --- --fail-on ---

test("default fail-on is missing: empty/extra alone don't trigger exit 1", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  write(".env", "DATABASE_URL=\nAPI_KEY=x\nDEBUG_MODE=1\n");
  const result = run(dir);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(
    [".env:", "  EMPTY: DATABASE_URL", "  EXTRA: DEBUG_MODE", ""].join("\n"),
  );
});

test("--fail-on=empty triggers exit 1 on an empty finding but not on extra", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=\nDEBUG_MODE=1\n");
  const result = run(dir, ["--fail-on=empty"]);
  expect(result.exitCode).toBe(1);
});

test("--fail-on=extra triggers exit 1 on an extra finding", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\nDEBUG_MODE=1\n");
  const result = run(dir, ["--fail-on=extra"]);
  expect(result.exitCode).toBe(1);
});

test("--fail-on=extra does not trigger exit 1 on a missing finding", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  write(".env", "DATABASE_URL=x\n");
  const result = run(dir, ["--fail-on=extra"]);
  expect(result.exitCode).toBe(0);
});

test("--fail-on=missing,empty combines both kinds", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  write(".env", "DATABASE_URL=\n");
  const result = run(dir, ["--fail-on=missing,empty"]);
  expect(result.exitCode).toBe(1);
});

test("--fail-on=missing, empty (whitespace after comma) is trimmed and valid", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=\n");
  const result = run(dir, ["--fail-on=missing, empty"]);
  expect(result.exitCode).toBe(1);
});

test("explicit --fail-on= means fail on nothing, even with a missing key present", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  write(".env", "DATABASE_URL=x\n");
  const result = run(dir, ["--fail-on="]);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe([".env:", "  MISSING: API_KEY", ""].join("\n"));
});

test("--fail-on= as whitespace only is treated as empty (fail on nothing)", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\n");
  const result = run(dir, ["--fail-on= "]);
  expect(result.exitCode).toBe(0);
});

test("an invalid --fail-on token is a usage error, exit 2", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\n");
  const result = run(dir, ["--fail-on=missing,typo"]);
  expect(result.exitCode).toBe(2);
  expect(result.output).toContain("typo");
});

test("a stray double comma in --fail-on (empty token after trim) is a usage error", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\n");
  const result = run(dir, ["--fail-on=missing,,empty"]);
  expect(result.exitCode).toBe(2);
});

test("an unknown flag is a usage error, exit 2", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\n");
  const result = run(dir, ["--bogus"]);
  expect(result.exitCode).toBe(2);
});

test("flags are validated before any file I/O: bad flag with no .env.example is still a usage error, not a 'not found' error", () => {
  const result = run(dir, ["--bogus"]);
  expect(result.exitCode).toBe(2);
  expect(result.output).not.toContain(".env.example not found");
});

test("an invalid --fail-on value with no .env.example is still a usage error, not a 'not found' error", () => {
  const result = run(dir, ["--fail-on=typo"]);
  expect(result.exitCode).toBe(2);
  expect(result.output).not.toContain(".env.example not found");
});

// --- --ignore-extra ---

test("--ignore-extra suppresses a matching extra key from the report entirely", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\nDEBUG_MODE=1\n");
  const result = run(dir, ["--ignore-extra=DEBUG_MODE"]);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(".env: OK\n");
});

test("--ignore-extra only suppresses the named key, leaving other extras reported", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\nDEBUG_MODE=1\nOTHER_EXTRA=1\n");
  const result = run(dir, ["--ignore-extra=DEBUG_MODE"]);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe([".env:", "  EXTRA: OTHER_EXTRA", ""].join("\n"));
});

test("--ignore-extra list is comma-separated with optional whitespace, trimmed", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\nDEBUG_MODE=1\nOTHER_EXTRA=1\n");
  const result = run(dir, ["--ignore-extra=DEBUG_MODE, OTHER_EXTRA"]);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(".env: OK\n");
});

test("a suppressed extra key cannot by itself trigger --fail-on=extra", () => {
  write(".env.example", "DATABASE_URL=\n");
  write(".env", "DATABASE_URL=x\nDEBUG_MODE=1\n");
  const result = run(dir, ["--fail-on=extra", "--ignore-extra=DEBUG_MODE"]);
  expect(result.exitCode).toBe(0);
  expect(result.output).toBe(".env: OK\n");
});

test("--ignore-extra does not suppress missing or empty findings for the same key name", () => {
  write(".env.example", "DATABASE_URL=\nAPI_KEY=\n");
  write(".env", "DATABASE_URL=\n");
  const result = run(dir, ["--ignore-extra=API_KEY"]);
  expect(result.exitCode).toBe(1); // MISSING: API_KEY still triggers the default fail-on=missing
  expect(result.output).toBe(
    [".env:", "  MISSING: API_KEY", "  EMPTY: DATABASE_URL", ""].join("\n"),
  );
});
