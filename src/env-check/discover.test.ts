import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { discoverEnvFiles } from "./discover.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "env-check-discover-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string): void {
  writeFileSync(join(dir, name), "");
}

test("finds a plain .env file", () => {
  write(".env");
  expect(discoverEnvFiles(dir)).toEqual([".env"]);
});

test("finds multiple .env.* variants sorted alphabetically regardless of creation order", () => {
  write(".env.production");
  write(".env");
  write(".env.local");
  expect(discoverEnvFiles(dir)).toEqual([".env", ".env.local", ".env.production"]);
});

test("excludes .env.example", () => {
  write(".env");
  write(".env.example");
  expect(discoverEnvFiles(dir)).toEqual([".env"]);
});

test("excludes a directory named .env even though the name matches", () => {
  mkdirSync(join(dir, ".env"));
  write(".env.local");
  expect(discoverEnvFiles(dir)).toEqual([".env.local"]);
});

test("ignores non-matching file names", () => {
  write(".envrc");
  write("README.md");
  write(".environment");
  expect(discoverEnvFiles(dir)).toEqual([]);
});

test("returns an empty array when only .env.example exists", () => {
  write(".env.example");
  expect(discoverEnvFiles(dir)).toEqual([]);
});
