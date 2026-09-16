export interface ParsedVariable {
  readonly key: string;
  readonly isEmpty: boolean;
  readonly isOptional: boolean;
}

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EMPTY_QUOTED_PATTERN = /^(["'])\1$/; // exactly "" or '' — nothing between matching quotes
const OPTIONAL_MARKER_PATTERN = /\s#\s*optional\s*$/i; // trailing "# optional" marker, exact match only

export function parseEnvFile(content: string): ParsedVariable[] {
  const byKey = new Map<string, { isEmpty: boolean; isOptional: boolean }>(); // last occurrence wins
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const exportMatch = line.match(/^export\s+(.*)$/);
    let stmt = exportMatch ? (exportMatch[1] ?? "") : line;
    const isOptional = OPTIONAL_MARKER_PATTERN.test(stmt);
    if (isOptional) stmt = stmt.replace(OPTIONAL_MARKER_PATTERN, "");
    const eq = stmt.indexOf("=");
    if (eq === -1) {
      if (KEY_PATTERN.test(stmt)) byKey.set(stmt, { isEmpty: true, isOptional }); // bare key, no '='
      continue;
    }
    const key = stmt.slice(0, eq).trim();
    if (!KEY_PATTERN.test(key)) continue;
    const value = stmt.slice(eq + 1).trim();
    const isEmpty = value === "" || EMPTY_QUOTED_PATTERN.test(value);
    byKey.set(key, { isEmpty, isOptional });
  }
  return [...byKey.entries()].map(([key, v]) => ({ key, ...v }));
}
