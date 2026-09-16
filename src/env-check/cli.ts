import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "./parser.js";
import { compareEnvToExample } from "./compare.js";
import { formatReport } from "./format.js";

function readEnvFile(path: string, label: string): { content: string } | { error: string } {
  try {
    return { content: readFileSync(path, "utf8") };
  } catch (err) {
    return { error: `Error: could not read ${label}: ${describeError(err)}\n` };
  }
}

function describeError(err: unknown): string {
  const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
  switch (code) {
    case "EACCES":
    case "EPERM":
      return "permission denied";
    case "EISDIR":
      return "is a directory";
    case "ENOENT":
      return "not found";
    default:
      return err instanceof Error ? err.message : String(err);
  }
}

export function run(cwd: string): { output: string; exitCode: number } {
  const examplePath = join(cwd, ".env.example");
  if (!existsSync(examplePath)) {
    return { output: "Error: .env.example not found\n", exitCode: 1 };
  }
  const envPath = join(cwd, ".env");
  if (!existsSync(envPath)) {
    return { output: "Error: .env not found\n", exitCode: 1 };
  }
  const exampleRead = readEnvFile(examplePath, ".env.example");
  if ("error" in exampleRead) {
    return { output: exampleRead.error, exitCode: 1 };
  }
  const envRead = readEnvFile(envPath, ".env");
  if ("error" in envRead) {
    return { output: envRead.error, exitCode: 1 };
  }
  const example = parseEnvFile(exampleRead.content);
  const actual = parseEnvFile(envRead.content);
  const result = compareEnvToExample(example, actual);
  return { output: formatReport(result), exitCode: result.missing.length > 0 ? 1 : 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { output, exitCode } = run(process.cwd());
  process.stdout.write(output);
  process.exit(exitCode);
}
