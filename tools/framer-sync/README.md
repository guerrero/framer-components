# Framer sync / install CLI

Syncs code components and overrides from this repo into a Framer project. Two transports are
available:

- **Server API** (`pnpm framer:sync`) — connects with `framer-api` and a Server API key. Best for
  CI.
- **Agent CLI** (`pnpm framer:install`) — drives `@framer/agent` sessions, using the project
  authorization already saved on this machine (browser approval or a saved key). No API key in
  `.env` is needed.

```bash
# Server API transport
FRAMER_API_KEY=... FRAMER_PROJECT_URL=... pnpm framer:sync

# Agent transport
pnpm exec agent project auth <project-url>     # once
pnpm framer:install --project <project-url>
```

Both support `--dry-run`, `--check` (exit 1 on drift), `--typecheck` (Framer's own TypeScript
service) and `--only components/`. The agent transport adds `--session <id>` (reuse an existing
session) and `--keep-session`.

Files are mapped by `SOURCES` in `src/sync.ts`:

```
src/components/PillButton.tsx    →  components/PillButton.tsx
src/overrides/withHoverLift.tsx  →  overrides/withHoverLift.tsx
```

Both transports print the exports Framer detected per file (`default · component` vs `override`),
which verifies the type-based override detection.

## How the agent transport works

`installViaAgent` (`src/agent.ts`) shells out to the `@framer/agent` CLI:

1. `agent session new <project>` → the session id is printed on stdout,
2. one `agent exec -s <id>` run with a generated script that uses the plugin API for code files
   (`framer.getCodeFiles`, `framer.createCodeFile`, `CodeFile.setFileContent`, optionally
   `framer.typecheckCode`),
3. `agent session destroy <id>` unless `--keep-session` or `--session` was used.

Failures are reported per file (`blocked`) without aborting the run. The agent's authoring guidance
ships with the dependency at `node_modules/@framer/agent/skills/framer-code-components/SKILL.md`.
