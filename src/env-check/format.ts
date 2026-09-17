import type { CompareResult } from "./compare.js";

export function formatReport(fileName: string, result: CompareResult): string {
  if (result.missing.length === 0 && result.empty.length === 0 && result.extra.length === 0) {
    return `${fileName}: OK\n`;
  }
  const lines = [`${fileName}:`];
  for (const key of result.missing) lines.push(`  MISSING: ${key}`);
  for (const key of result.empty) lines.push(`  EMPTY: ${key}`);
  for (const key of result.extra) lines.push(`  EXTRA: ${key}`);
  return lines.join("\n") + "\n";
}
