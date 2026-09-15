export interface ParsedVariable {
  readonly key: string;
  readonly isEmpty: boolean;
}

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseEnvFile(content: string): ParsedVariable[] {
  const byKey = new Map<string, boolean>(); // last occurrence wins
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!KEY_PATTERN.test(key)) continue;
    const value = line.slice(eq + 1).trim();
    byKey.set(key, value === "");
  }
  return [...byKey.entries()].map(([key, isEmpty]) => ({ key, isEmpty }));
}
