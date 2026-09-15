import type { ParsedVariable } from "./parser.js";

export interface CompareResult {
  readonly missing: readonly string[];
  readonly empty: readonly string[];
  readonly extra: readonly string[];
}

export function compareEnvToExample(
  example: readonly ParsedVariable[],
  actual: readonly ParsedVariable[],
): CompareResult {
  const actualByKey = new Map(actual.map((v) => [v.key, v] as const));
  const exampleKeys = new Set(example.map((v) => v.key));

  const missing: string[] = [];
  const empty: string[] = [];
  for (const ex of example) {
    const found = actualByKey.get(ex.key);
    if (found === undefined) missing.push(ex.key);
    else if (found.isEmpty) empty.push(ex.key);
  }

  const extra = actual.filter((v) => !exampleKeys.has(v.key)).map((v) => v.key);

  return { missing, empty, extra };
}
