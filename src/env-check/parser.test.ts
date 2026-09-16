import { expect, test } from "vitest";
import { parseEnvFile } from "./parser.js";

test("parses a basic KEY=value line", () => {
  expect(parseEnvFile("PORT=3000")).toEqual([{ key: "PORT", isEmpty: false }]);
});

test("skips blank lines and full-line comments", () => {
  expect(parseEnvFile("\n# a comment\n   \nPORT=3000\n# another\n")).toEqual([
    { key: "PORT", isEmpty: false },
  ]);
});

test("treats KEY= as empty", () => {
  expect(parseEnvFile("API_KEY=")).toEqual([{ key: "API_KEY", isEmpty: true }]);
});

test("treats whitespace-only value as empty", () => {
  expect(parseEnvFile("API_KEY=   ")).toEqual([{ key: "API_KEY", isEmpty: true }]);
});

test("silently skips a line with an invalid key (leading digit)", () => {
  expect(parseEnvFile("1KEY=value")).toEqual([]);
});

test("silently skips an export-prefixed line (key contains a space)", () => {
  expect(parseEnvFile("export PORT=3000")).toEqual([]);
});

test("last occurrence of a duplicate key wins", () => {
  expect(parseEnvFile("PORT=3000\nPORT=")).toEqual([{ key: "PORT", isEmpty: true }]);
});

test('treats KEY="" (empty double-quoted string) as empty', () => {
  expect(parseEnvFile('API_KEY=""')).toEqual([{ key: "API_KEY", isEmpty: true }]);
});

test("treats KEY='' (empty single-quoted string) as empty", () => {
  expect(parseEnvFile("API_KEY=''")).toEqual([{ key: "API_KEY", isEmpty: true }]);
});

test("treats a bare key with no equals sign as empty", () => {
  expect(parseEnvFile("API_KEY")).toEqual([{ key: "API_KEY", isEmpty: true }]);
});

test("does not treat a quoted single space as empty", () => {
  expect(parseEnvFile('API_KEY=" "')).toEqual([{ key: "API_KEY", isEmpty: false }]);
});

test("does not treat a quoted non-empty value with padding spaces as empty", () => {
  expect(parseEnvFile('API_KEY=" foo "')).toEqual([{ key: "API_KEY", isEmpty: false }]);
});

test("does not treat an unterminated quote as empty (no special quote handling)", () => {
  expect(parseEnvFile('API_KEY="foo')).toEqual([{ key: "API_KEY", isEmpty: false }]);
});

test("does not treat mismatched quote characters as empty", () => {
  expect(parseEnvFile("API_KEY=\"foo'")).toEqual([{ key: "API_KEY", isEmpty: false }]);
});

test("does not treat a malformed line with no equals sign and no valid bare key as empty", () => {
  expect(parseEnvFile("not a key")).toEqual([]);
});

test("mixed file parses only the recognized lines, in first-seen order", () => {
  const content = [
    "# top comment",
    "",
    "DATABASE_URL=postgres://localhost/dev",
    "API_KEY=",
    "not a valid line",
    "PORT=3000",
  ].join("\n");
  expect(parseEnvFile(content)).toEqual([
    { key: "DATABASE_URL", isEmpty: false },
    { key: "API_KEY", isEmpty: true },
    { key: "PORT", isEmpty: false },
  ]);
});
