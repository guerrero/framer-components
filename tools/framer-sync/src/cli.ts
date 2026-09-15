import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { installViaAgent } from "./agent.ts";
import { collectLocalFiles, syncWithFramer, type SyncOutcome } from "./sync.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

loadDotEnv();

const args = process.argv.slice(2);

// npm-style invocations forward the separator; pnpm does too, so drop it.
if (args[0] === "--") args.shift();

const { values } = parseArgs({
  args,
  options: {
    project: { type: "string" },
    "api-key": { type: "string" },
    only: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    check: { type: "boolean", default: false },
    typecheck: { type: "boolean", default: false },
    agent: { type: "boolean", default: false },
    session: { type: "string" },
    "keep-session": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  printHelp();
  process.exit(0);
}

const useAgent = values.agent || values.session !== undefined;
const projectUrl = values.project ?? process.env.FRAMER_PROJECT_URL;
const apiKey = values["api-key"] ?? process.env.FRAMER_API_KEY;

if (!useAgent && !projectUrl) {
  console.error("Missing project URL. Set FRAMER_PROJECT_URL in .env or pass --project <url>.\n");
  printHelp();
  process.exit(1);
}

if (useAgent && !projectUrl && !values.session) {
  console.error("The agent transport needs a project URL (or an existing --session <id>).\n");
  printHelp();
  process.exit(1);
}

let outcomes: SyncOutcome[];

if (useAgent) {
  const collected = await collectLocalFiles(repoRoot);
  const files = collected.filter((file) => !values.only || file.remotePath.startsWith(values.only));

  if (files.length === 0) {
    throw new Error(
      `No code files matched${values.only ? ` "${values.only}"` : ""}. Check --only and SOURCES in sync.ts.`,
    );
  }

  outcomes = await installViaAgent(files, {
    repoRoot,
    projectUrl,
    sessionId: values.session,
    dryRun: values["dry-run"],
    check: values.check,
    typecheck: values.typecheck,
    keepSession: values["keep-session"],
  });
} else if (projectUrl) {
  outcomes = await syncWithFramer({
    repoRoot,
    projectUrl,
    apiKey,
    only: values.only,
    dryRun: values["dry-run"],
    check: values.check,
    typecheck: values.typecheck,
  });
} else {
  throw new Error("Missing project URL.");
}

printReport(outcomes, {
  project: projectUrl,
  agent: useAgent,
  check: values.check,
  dryRun: values["dry-run"],
  typecheck: values.typecheck,
});

const blocked = outcomes.filter((outcome) => outcome.status === "blocked").length;
const drifted = outcomes.filter(
  (outcome) => outcome.status === "would-create" || outcome.status === "would-update",
).length;

if (blocked > 0 || (values.check && drifted > 0)) process.exit(1);

interface ReportContext {
  project?: string;
  agent: boolean;
  check: boolean;
  dryRun: boolean;
  typecheck: boolean;
}

function printReport(results: readonly SyncOutcome[], context: ReportContext): void {
  const transport = context.agent ? "agent CLI (@framer/agent)" : "Server API (framer-api)";

  console.log("\nFramer code file sync");
  console.log(`  transport  ${transport}`);
  if (context.project) console.log(`  project    ${context.project}`);
  console.log(`  mode       ${resolveMode(context)}`);
  console.log(`  typecheck  ${context.typecheck ? "enabled" : "disabled"}`);
  console.log(`  files      ${results.length}\n`);

  for (const result of results) {
    const exports = result.exports.length > 0 ? `  exports: ${result.exports.join(", ")}` : "";
    console.log(`  ${result.status.padEnd(13)} ${result.remotePath}${exports}`);
    for (const error of result.errors) console.log(`      ${error}`);
  }

  const counts = results.reduce<Record<string, number>>((summary, result) => {
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    return summary;
  }, {});

  const summary = Object.entries(counts)
    .map(([status, count]) => `${count} ${status}`)
    .join(" · ");
  console.log(`\n  ${summary}\n`);
}

function resolveMode(context: ReportContext): string {
  if (context.check) return "check (nothing is written)";
  if (context.dryRun) return "dry run (nothing is written)";
  return "write";
}

function loadDotEnv(): void {
  try {
    process.loadEnvFile(path.join(repoRoot, ".env"));
  } catch {
    // .env is optional — rely on the real environment when it is missing.
  }
}

function printHelp(): void {
  console.log(`Usage: pnpm framer:sync [options]        (Server API, needs FRAMER_API_KEY)
       pnpm framer:install [options]     (agent CLI, uses saved project auth)

Sync code components and overrides from this repo into a Framer project.

Options:
  --project <url>   Framer project URL or id (default: FRAMER_PROJECT_URL)
  --api-key <key>   Framer Server API key (default: FRAMER_API_KEY)
  --only <prefix>   Sync only files under a remote prefix, e.g. components/
  --dry-run         Report what would change without writing anything
  --check           Exit with code 1 when the project differs from this repo
  --typecheck       Run Framer's typechecker before pushing each file
  --agent           Use the @framer/agent CLI instead of the Server API
  --session <id>    Reuse an existing agent session (implies --agent)
  --keep-session    Keep the agent session open after the run
  -h, --help        Show this help

Agent transport:
  Authorize a project once (browser approval or API key):
    pnpm exec agent project auth <project-url> [api-key]
  Then install without any API key in .env:
    pnpm framer:install --project <project-url>
`);
}
