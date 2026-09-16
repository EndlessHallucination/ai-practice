import { expect, test } from "vitest";
import { parseEnvFile } from "./parser.js";

test("parses a basic KEY=value line", () => {
  expect(parseEnvFile("PORT=3000")).toEqual([{ key: "PORT", isEmpty: false, isOptional: false }]);
});

test("skips blank lines and full-line comments", () => {
  expect(parseEnvFile("\n# a comment\n   \nPORT=3000\n# another\n")).toEqual([
    { key: "PORT", isEmpty: false, isOptional: false },
  ]);
});

test("treats KEY= as empty", () => {
  expect(parseEnvFile("API_KEY=")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: false },
  ]);
});

test("treats whitespace-only value as empty", () => {
  expect(parseEnvFile("API_KEY=   ")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: false },
  ]);
});

test("silently skips a line with an invalid key (leading digit)", () => {
  expect(parseEnvFile("1KEY=value")).toEqual([]);
});

test("parses an export-prefixed line as a normal variable", () => {
  expect(parseEnvFile("export PORT=3000")).toEqual([
    { key: "PORT", isEmpty: false, isOptional: false },
  ]);
});

test("does not treat exported=value as export-prefixed (no whitespace after export)", () => {
  expect(parseEnvFile("exported=value")).toEqual([
    { key: "exported", isEmpty: false, isOptional: false },
  ]);
});

test("does not treat export=value as export-prefixed (no whitespace after export)", () => {
  expect(parseEnvFile("export=value")).toEqual([
    { key: "export", isEmpty: false, isOptional: false },
  ]);
});

test("strips an export prefix with multiple spaces", () => {
  expect(parseEnvFile("export   PORT=3000")).toEqual([
    { key: "PORT", isEmpty: false, isOptional: false },
  ]);
});

test("strips export prefix from a bare key with no equals sign", () => {
  expect(parseEnvFile("export FOO")).toEqual([
    { key: "FOO", isEmpty: true, isOptional: false },
  ]);
});

test("last occurrence of a duplicate key wins", () => {
  expect(parseEnvFile("PORT=3000\nPORT=")).toEqual([
    { key: "PORT", isEmpty: true, isOptional: false },
  ]);
});

test('treats KEY="" (empty double-quoted string) as empty', () => {
  expect(parseEnvFile('API_KEY=""')).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: false },
  ]);
});

test("treats KEY='' (empty single-quoted string) as empty", () => {
  expect(parseEnvFile("API_KEY=''")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: false },
  ]);
});

test("treats a bare key with no equals sign as empty", () => {
  expect(parseEnvFile("API_KEY")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: false },
  ]);
});

test("does not treat a quoted single space as empty", () => {
  expect(parseEnvFile('API_KEY=" "')).toEqual([
    { key: "API_KEY", isEmpty: false, isOptional: false },
  ]);
});

test("does not treat a quoted non-empty value with padding spaces as empty", () => {
  expect(parseEnvFile('API_KEY=" foo "')).toEqual([
    { key: "API_KEY", isEmpty: false, isOptional: false },
  ]);
});

test("does not treat an unterminated quote as empty (no special quote handling)", () => {
  expect(parseEnvFile('API_KEY="foo')).toEqual([
    { key: "API_KEY", isEmpty: false, isOptional: false },
  ]);
});

test("does not treat mismatched quote characters as empty", () => {
  expect(parseEnvFile("API_KEY=\"foo'")).toEqual([
    { key: "API_KEY", isEmpty: false, isOptional: false },
  ]);
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
    { key: "DATABASE_URL", isEmpty: false, isOptional: false },
    { key: "API_KEY", isEmpty: true, isOptional: false },
    { key: "PORT", isEmpty: false, isOptional: false },
  ]);
});

test("recognizes a trailing # optional marker on an assignment", () => {
  expect(parseEnvFile("API_KEY= # optional")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: true },
  ]);
});

test("optional marker is case-insensitive", () => {
  expect(parseEnvFile("API_KEY= # OPTIONAL")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: true },
  ]);
});

test("optional marker does not require a space after #", () => {
  expect(parseEnvFile("API_KEY= #optional")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: true },
  ]);
});

test("does not treat a marker with trailing text as optional (no prefix matching)", () => {
  expect(parseEnvFile("API_KEY= # optional, see docs")).toEqual([
    { key: "API_KEY", isEmpty: false, isOptional: false },
  ]);
});

test("does not treat # as a comment when not preceded by whitespace, so no marker is recognized", () => {
  expect(parseEnvFile("API_KEY=value#optional")).toEqual([
    { key: "API_KEY", isEmpty: false, isOptional: false },
  ]);
});

test("recognizes the optional marker on a bare key with no equals sign", () => {
  expect(parseEnvFile("API_KEY # optional")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: true },
  ]);
});

test("recognizes the optional marker after an export prefix", () => {
  expect(parseEnvFile("export API_KEY= # optional")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: true },
  ]);
});

test("last occurrence of a duplicate key wins for isOptional too", () => {
  expect(parseEnvFile("API_KEY=value\nAPI_KEY= # optional")).toEqual([
    { key: "API_KEY", isEmpty: true, isOptional: true },
  ]);
});
