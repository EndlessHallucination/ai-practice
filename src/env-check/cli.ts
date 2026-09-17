import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverEnvFiles } from "./discover.js";
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
  const exampleRead = readEnvFile(examplePath, ".env.example");
  if ("error" in exampleRead) {
    return { output: exampleRead.error, exitCode: 1 };
  }
  const example = parseEnvFile(exampleRead.content);

  const variantFiles = discoverEnvFiles(cwd);
  if (variantFiles.length === 0) {
    return { output: "Warning: no .env or .env.* files found\n", exitCode: 0 };
  }

  const sections: string[] = [];
  let exitCode = 0;
  for (const file of variantFiles) {
    const fileRead = readEnvFile(join(cwd, file), file);
    if ("error" in fileRead) {
      sections.push(fileRead.error);
      exitCode = 1;
      continue;
    }
    const actual = parseEnvFile(fileRead.content);
    const result = compareEnvToExample(example, actual);
    if (result.missing.length > 0) exitCode = 1;
    sections.push(formatReport(file, result));
  }
  return { output: sections.join(""), exitCode };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { output, exitCode } = run(process.cwd());
  process.stdout.write(output);
  process.exit(exitCode);
}
