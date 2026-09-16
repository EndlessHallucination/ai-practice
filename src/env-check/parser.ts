export interface ParsedVariable {
  readonly key: string;
  readonly isEmpty: boolean;
}

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EMPTY_QUOTED_PATTERN = /^(["'])\1$/; // exactly "" or '' — nothing between matching quotes

export function parseEnvFile(content: string): ParsedVariable[] {
  const byKey = new Map<string, boolean>(); // last occurrence wins
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const exportMatch = line.match(/^export\s+(.*)$/);
    const stmt = exportMatch ? (exportMatch[1] ?? "") : line;
    const eq = stmt.indexOf("=");
    if (eq === -1) {
      if (KEY_PATTERN.test(stmt)) byKey.set(stmt, true); // bare key, no '='
      continue;
    }
    const key = stmt.slice(0, eq).trim();
    if (!KEY_PATTERN.test(key)) continue;
    const value = stmt.slice(eq + 1).trim();
    byKey.set(key, value === "" || EMPTY_QUOTED_PATTERN.test(value));
  }
  return [...byKey.entries()].map(([key, isEmpty]) => ({ key, isEmpty }));
}
