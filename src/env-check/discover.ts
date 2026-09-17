import { readdirSync } from "node:fs";

const ENV_FILE_PATTERN = /^\.env(\..+)?$/;

export function discoverEnvFiles(cwd: string): string[] {
  return readdirSync(cwd, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && ENV_FILE_PATTERN.test(entry.name) && entry.name !== ".env.example",
    )
    .map((entry) => entry.name)
    .sort();
}
