import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "./parser.js";
import { compareEnvToExample } from "./compare.js";
import { formatReport } from "./format.js";

export function run(cwd: string): { output: string; exitCode: number } {
  const examplePath = join(cwd, ".env.example");
  if (!existsSync(examplePath)) {
    return { output: "Error: .env.example not found\n", exitCode: 1 };
  }
  const envPath = join(cwd, ".env");
  if (!existsSync(envPath)) {
    return { output: "Error: .env not found\n", exitCode: 1 };
  }
  const example = parseEnvFile(readFileSync(examplePath, "utf8"));
  const actual = parseEnvFile(readFileSync(envPath, "utf8"));
  const result = compareEnvToExample(example, actual);
  return { output: formatReport(result), exitCode: result.missing.length > 0 ? 1 : 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { output, exitCode } = run(process.cwd());
  process.stdout.write(output);
  process.exit(exitCode);
}
