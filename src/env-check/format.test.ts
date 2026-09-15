import { expect, test } from "vitest";
import { formatReport } from "./format.js";
import type { CompareResult } from "./compare.js";

test("clean result formats as a single OK line", () => {
  const result: CompareResult = { missing: [], empty: [], extra: [] };
  expect(formatReport(result)).toBe(".env: OK\n");
});

test("renders one of each finding kind in fixed order (missing, empty, extra)", () => {
  // Deliberately constructed out of that order to prove format.ts doesn't trust input order.
  const result: CompareResult = {
    extra: ["DEBUG_MODE"],
    missing: ["DATABASE_URL"],
    empty: ["PORT"],
  };
  expect(formatReport(result)).toBe(
    [".env:", "  MISSING: DATABASE_URL", "  EMPTY: PORT", "  EXTRA: DEBUG_MODE", ""].join("\n"),
  );
});

test("renders multiple keys within the same kind", () => {
  const result: CompareResult = { missing: ["A", "B"], empty: [], extra: [] };
  expect(formatReport(result)).toBe([".env:", "  MISSING: A", "  MISSING: B", ""].join("\n"));
});
