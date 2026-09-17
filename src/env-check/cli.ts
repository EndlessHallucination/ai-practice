import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { discoverEnvFiles } from "./discover.js";
import { parseEnvFile } from "./parser.js";
import { compareEnvToExample } from "./compare.js";
import { formatReport } from "./format.js";

const FAIL_ON_KINDS = ["missing", "empty", "extra"] as const;
type FailOnKind = (typeof FAIL_ON_KINDS)[number];

function isFailOnKind(token: string): token is FailOnKind {
  return (FAIL_ON_KINDS as readonly string[]).includes(token);
}

function parseFailOn(raw: string): { kinds: Set<FailOnKind> } | { error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { kinds: new Set() };
  const kinds = new Set<FailOnKind>();
  for (const rawToken of trimmed.split(",")) {
    const token = rawToken.trim();
    if (!isFailOnKind(token)) {
      return {
        error: `invalid --fail-on value '${token}' (expected a comma-separated list of: missing, empty, extra)`,
      };
    }
    kinds.add(token);
  }
  return { kinds };
}

function parseIgnoreExtra(raw: string): Set<string> {
  const trimmed = raw.trim();
  if (trimmed === "") return new Set();
  return new Set(
    trimmed
      .split(",")
      .map((token) => token.trim())
      .filter((token) => token !== ""),
  );
}

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

export function run(
  cwd: string,
  argv: readonly string[] = [],
): { output: string; exitCode: number } {
  let values: { "fail-on": string; "ignore-extra": string };
  try {
    const parsed = parseArgs({
      args: argv as string[],
      options: {
        "fail-on": { type: "string", default: "missing" },
        "ignore-extra": { type: "string", default: "" },
      },
      strict: true,
    });
    values = parsed.values as { "fail-on": string; "ignore-extra": string };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: `Error: ${message}\n`, exitCode: 2 };
  }

  const failOnResult = parseFailOn(values["fail-on"]);
  if ("error" in failOnResult) {
    return { output: `Error: ${failOnResult.error}\n`, exitCode: 2 };
  }
  const failOn = failOnResult.kinds;
  const ignoreExtra = parseIgnoreExtra(values["ignore-extra"]);

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
    const rawResult = compareEnvToExample(example, actual);
    const result = {
      ...rawResult,
      extra: rawResult.extra.filter((key) => !ignoreExtra.has(key)),
    };
    const triggered =
      (failOn.has("missing") && result.missing.length > 0) ||
      (failOn.has("empty") && result.empty.length > 0) ||
      (failOn.has("extra") && result.extra.length > 0);
    if (triggered) exitCode = 1;
    sections.push(formatReport(file, result));
  }
  return { output: sections.join(""), exitCode };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { output, exitCode } = run(process.cwd(), process.argv.slice(2));
  process.stdout.write(output);
  process.exit(exitCode);
}
