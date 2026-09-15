import { expect, test } from "vitest";
import { compareEnvToExample } from "./compare.js";
import type { ParsedVariable } from "./parser.js";

function v(key: string, isEmpty = false): ParsedVariable {
  return { key, isEmpty };
}

test("reports a required key absent from actual as missing", () => {
  const result = compareEnvToExample([v("DATABASE_URL")], []);
  expect(result).toEqual({ missing: ["DATABASE_URL"], empty: [], extra: [] });
});

test("reports a required key present but empty in actual as empty", () => {
  const result = compareEnvToExample([v("DATABASE_URL")], [v("DATABASE_URL", true)]);
  expect(result).toEqual({ missing: [], empty: ["DATABASE_URL"], extra: [] });
});

test("reports no finding for a key present and non-empty", () => {
  const result = compareEnvToExample([v("DATABASE_URL")], [v("DATABASE_URL", false)]);
  expect(result).toEqual({ missing: [], empty: [], extra: [] });
});

test("reports an actual key not in example as extra", () => {
  const result = compareEnvToExample([], [v("DEBUG_MODE")]);
  expect(result).toEqual({ missing: [], empty: [], extra: ["DEBUG_MODE"] });
});

test("key comparison is case-sensitive", () => {
  const result = compareEnvToExample([v("DATABASE_URL")], [v("database_url")]);
  expect(result).toEqual({ missing: ["DATABASE_URL"], empty: [], extra: ["database_url"] });
});

test("fully clean case produces no findings", () => {
  const example = [v("DATABASE_URL"), v("PORT")];
  const actual = [v("DATABASE_URL", false), v("PORT", false)];
  expect(compareEnvToExample(example, actual)).toEqual({ missing: [], empty: [], extra: [] });
});
