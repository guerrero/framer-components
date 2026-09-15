import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { connect, type CodeFile, type Framer } from "framer-api";

export interface SourceMapping {
  /** Workspace-relative directory holding Framer code files. */
  dir: string;
  /** Folder used inside the Framer project. */
  remotePrefix: string;
}

export const SOURCES: readonly SourceMapping[] = [
  { dir: "src/components", remotePrefix: "components" },
  { dir: "src/overrides", remotePrefix: "overrides" },
];

export interface LocalCodeFile {
  localPath: string;
  remotePath: string;
  content: string;
}

/** Collect every `.tsx` code file that should live in the Framer project. */
export async function collectLocalFiles(repoRoot: string): Promise<LocalCodeFile[]> {
  const groups = await Promise.all(
    SOURCES.map(async (source): Promise<LocalCodeFile[]> => {
      const sourceRoot = path.join(repoRoot, source.dir);
      const entries = await readdir(sourceRoot, { recursive: true, withFileTypes: true });
      const wanted = entries.filter(
        (entry) => entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.includes(".test."),
      );

      return Promise.all(
        wanted.map(async (entry): Promise<LocalCodeFile> => {
          const absolutePath = path.join(entry.parentPath, entry.name);
          const relativePath = path.relative(sourceRoot, absolutePath).split(path.sep).join("/");

          return {
            localPath: absolutePath,
            remotePath: `${source.remotePrefix}/${relativePath}`,
            content: await readFile(absolutePath, "utf8"),
          };
        }),
      );
    }),
  );

  return groups.flat().toSorted((a, b) => a.remotePath.localeCompare(b.remotePath));
}

export type SyncStatus =
  | "created"
  | "updated"
  | "unchanged"
  | "would-create"
  | "would-update"
  | "blocked";

export interface SyncOutcome {
  remotePath: string;
  status: SyncStatus;
  /** Exports detected by Framer, e.g. `PillButton (default) · component`. */
  exports: string[];
  /** Typecheck errors reported by Framer. */
  errors: string[];
}

export interface SyncOptions {
  repoRoot: string;
  projectUrl: string;
  apiKey?: string;
  /** Only process files whose remote path starts with this prefix. */
  only?: string;
  /** Report what would happen without writing to the project. */
  dryRun?: boolean;
  /** Report drift; the CLI exits with code 1 when anything would change. */
  check?: boolean;
  /** Run Framer's typechecker before pushing each file. */
  typecheck?: boolean;
}

export async function syncWithFramer(options: SyncOptions): Promise<SyncOutcome[]> {
  const allFiles = await collectLocalFiles(options.repoRoot);
  const files = allFiles.filter(
    (file) => !options.only || file.remotePath.startsWith(options.only),
  );

  if (files.length === 0) {
    throw new Error(
      `No code files matched${options.only ? ` "${options.only}"` : ""}. Check --only and SOURCES in sync.ts.`,
    );
  }

  const framer = await connect(options.projectUrl, options.apiKey);

  try {
    const outcomes: SyncOutcome[] = [];
    for (const file of files) {
      // Pushed one at a time so the report stays deterministic.
      // eslint-disable-next-line no-await-in-loop
      outcomes.push(await syncFile(framer, file, options));
    }
    return outcomes;
  } finally {
    await framer.disconnect();
  }
}

async function syncFile(
  framer: Framer,
  file: LocalCodeFile,
  options: SyncOptions,
): Promise<SyncOutcome> {
  const errors = options.typecheck ? await typecheck(framer, file) : [];
  const existing = await framer.getCodeFile(file.remotePath);

  if (errors.length > 0) {
    return {
      remotePath: file.remotePath,
      status: "blocked",
      exports: describeExports(existing),
      errors,
    };
  }

  if (!existing) {
    if (options.dryRun || options.check) {
      return { remotePath: file.remotePath, status: "would-create", exports: [], errors };
    }
    const created = await framer.createCodeFile(file.remotePath, file.content);
    return {
      remotePath: file.remotePath,
      status: "created",
      exports: describeExports(created),
      errors,
    };
  }

  if (existing.content === file.content) {
    return {
      remotePath: file.remotePath,
      status: "unchanged",
      exports: describeExports(existing),
      errors,
    };
  }

  if (options.dryRun || options.check) {
    return {
      remotePath: file.remotePath,
      status: "would-update",
      exports: describeExports(existing),
      errors,
    };
  }

  const updated = await existing.setFileContent(file.content);
  return {
    remotePath: file.remotePath,
    status: "updated",
    exports: describeExports(updated),
    errors,
  };
}

async function typecheck(framer: Framer, file: LocalCodeFile): Promise<string[]> {
  const diagnostics: readonly unknown[] = await framer.typecheckCode(file.remotePath, file.content);
  return diagnostics.flatMap((diagnostic) => {
    const formatted = formatDiagnostic(diagnostic);
    return formatted ? [formatted] : [];
  });
}

interface DiagnosticLike {
  code?: number;
  /** ts.DiagnosticCategory: 1 = Error. */
  category?: number;
  fileName?: string;
  messageText?: string;
  span?: { start?: { line?: number; character?: number } };
}

function formatDiagnostic(diagnostic: unknown): string | undefined {
  if (typeof diagnostic !== "object" || diagnostic === null) return undefined;

  const value = diagnostic as DiagnosticLike;
  if (value.category !== 1) return undefined;

  const start = value.span?.start;
  const location = start
    ? `${value.fileName ?? "unknown"}:${start.line ?? 0}:${start.character ?? 0}`
    : (value.fileName ?? "unknown");

  return `${location} — TS${value.code ?? "?"}: ${value.messageText ?? "Unknown error"}`;
}

function describeExports(codeFile: CodeFile | null): string[] {
  return (codeFile?.exports ?? []).map((item) => {
    const name = item.isDefaultExport ? `${item.name} (default)` : item.name;
    return `${name} · ${item.type}`;
  });
}
