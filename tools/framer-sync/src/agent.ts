import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import type { LocalCodeFile, SyncOutcome } from "./sync.ts";

/**
 * Install code files through the `@framer/agent` CLI.
 *
 * This is the alternative to the Server API transport in `sync.ts`: instead of
 * an API key it uses the agent's own authentication (browser approval or a
 * saved key) and its relay session. Code files themselves are managed with the
 * generic plugin API inside `exec` (`framer.getCodeFiles`,
 * `framer.createCodeFile`, `CodeFile.setFileContent`), which the `framer` skill
 * lists as one of the capabilities without a dedicated CLI command.
 */

const RESULT_MARKER = "__FRAMER_INSTALL_RESULT__";
const AGENT_PACKAGE = "@framer/agent@0.0.44";
const EXEC_TIMEOUT_MS = 180_000;

interface AgentRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface AgentInstallOptions {
  repoRoot: string;
  projectUrl?: string;
  /** Reuse an existing session instead of creating (and destroying) one. */
  sessionId?: string;
  /** Report the plan without writing to the project. */
  dryRun?: boolean;
  /** Report drift only; the CLI exits with code 1 when anything would change. */
  check?: boolean;
  /** Run Framer's typechecker before pushing each file. */
  typecheck?: boolean;
  /** Keep the session open after the run. */
  keepSession?: boolean;
}

export async function installViaAgent(
  files: readonly LocalCodeFile[],
  options: AgentInstallOptions,
): Promise<SyncOutcome[]> {
  if (!options.projectUrl && !options.sessionId) {
    throw new Error("installViaAgent requires a project URL or an existing session id.");
  }

  const sessionId =
    options.sessionId ?? (await createSession(options.repoRoot, options.projectUrl ?? ""));
  const ownsSession = options.sessionId === undefined;

  try {
    const script = buildExecScript(files, {
      check: Boolean(options.dryRun || options.check),
      typecheck: Boolean(options.typecheck),
    });
    const result = await runAgentCli(options.repoRoot, ["exec", "-s", sessionId], script);
    return parseResult(result);
  } finally {
    if (ownsSession && !options.keepSession) {
      await destroySession(options.repoRoot, sessionId);
    }
  }
}

async function createSession(repoRoot: string, projectUrl: string): Promise<string> {
  const result = await runAgentCli(repoRoot, ["session", "new", projectUrl]);
  const sessionId = lastNonEmptyLine(result.stdout);

  if (result.exitCode !== 0 || !sessionId) {
    throw new Error(
      [
        `Could not create a Framer agent session for ${projectUrl}.`,
        result.stderr.trim() || result.stdout.trim(),
        "Authorize the project first: pnpm exec agent project auth <project-url>",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return sessionId;
}

async function destroySession(repoRoot: string, sessionId: string): Promise<void> {
  await runAgentCli(repoRoot, ["session", "destroy", sessionId]);
}

function runAgentCli(
  repoRoot: string,
  args: readonly string[],
  input?: string,
): Promise<AgentRunResult> {
  const cliPath = path.join(repoRoot, "node_modules", "@framer", "agent", "dist", "cli.js");
  const local = existsSync(cliPath);
  const command = local ? process.execPath : "npx";
  const commandArgs = local ? [cliPath, ...args] : ["-y", AGENT_PACKAGE, ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGTERM"), EXEC_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });

    child.stdin.end(input ?? "");
  });
}

function parseResult(result: AgentRunResult): SyncOutcome[] {
  const line = result.stdout.split("\n").find((entry) => entry.startsWith(RESULT_MARKER));

  if (!line) {
    throw new Error(
      ["The agent exec run did not return a result.", result.stderr.trim(), result.stdout.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }

  try {
    return JSON.parse(line.slice(RESULT_MARKER.length)) as SyncOutcome[];
  } catch (error) {
    throw new Error(`Could not parse the agent exec result: ${String(error)}`);
  }
}

function lastNonEmptyLine(output: string): string | undefined {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}

/**
 * The script runs inside `@framer/agent exec`. Keep it dependency-free and
 * defensive: it must work against any project state and report per-file
 * failures without aborting the whole run.
 */
function buildExecScript(
  files: readonly LocalCodeFile[],
  options: { check: boolean; typecheck: boolean },
): string {
  const payload = JSON.stringify(files.map(({ remotePath, content }) => ({ remotePath, content })));

  return `
const files = ${payload};
const checkOnly = ${JSON.stringify(options.check)};
const runTypecheck = ${JSON.stringify(options.typecheck)};
const MARKER = ${JSON.stringify(RESULT_MARKER)};

const normalize = (value) => String(value || '').replace(/^\\/+/, '');

const describeExports = (codeFile) => {
  const exports = (codeFile && codeFile.exports) || [];
  return exports.map((item) => (item.isDefaultExport ? item.name + ' (default)' : item.name) + ' · ' + item.type);
};

const formatDiagnostic = (diagnostic) => {
  const start = diagnostic.span && diagnostic.span.start;
  const where = start
    ? (diagnostic.fileName || 'unknown') + ':' + start.line + ':' + start.character
    : (diagnostic.fileName || 'unknown');
  return where + ' — TS' + diagnostic.code + ': ' + (diagnostic.messageText || 'Unknown error');
};

const remoteFiles = await framer.getCodeFiles();
const byPath = new Map();
for (const remote of remoteFiles) {
  byPath.set(normalize(remote.path), remote);
  byPath.set(normalize(remote.name), remote);
}

const outcomes = [];
for (const file of files) {
  const outcome = { remotePath: file.remotePath, status: 'unchanged', exports: [], errors: [] };
  try {
    if (runTypecheck && typeof framer.typecheckCode === 'function') {
      const diagnostics = await framer.typecheckCode(file.remotePath, file.content);
      const errors = diagnostics.filter((diagnostic) => diagnostic.category === 1).map(formatDiagnostic);
      if (errors.length > 0) {
        outcome.status = 'blocked';
        outcome.errors = errors;
        outcomes.push(outcome);
        continue;
      }
    }

    const existing = byPath.get(normalize(file.remotePath)) || null;
    if (!existing) {
      if (checkOnly) {
        outcome.status = 'would-create';
      } else {
        const created = await framer.createCodeFile(file.remotePath, file.content);
        outcome.status = 'created';
        outcome.exports = describeExports(created);
      }
    } else if (existing.content === file.content) {
      outcome.status = 'unchanged';
      outcome.exports = describeExports(existing);
    } else if (checkOnly) {
      outcome.status = 'would-update';
      outcome.exports = describeExports(existing);
    } else {
      const updated = await existing.setFileContent(file.content);
      outcome.status = 'updated';
      outcome.exports = describeExports(updated);
    }
  } catch (error) {
    outcome.status = 'blocked';
    outcome.errors = [String((error && error.message) || error)];
  }
  outcomes.push(outcome);
}

console.log(MARKER + JSON.stringify(outcomes));
`.trim();
}
