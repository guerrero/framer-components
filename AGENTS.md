# AGENTS.md

pnpm monorepo for developing **Framer code components** and **code overrides**
outside Framer: a local playground, Vitest tests, and a CLI that syncs code files
into a Framer project. Full project tour: [README.md](README.md).

## Setup and commands

Requires Node ≥ 22.12 and pnpm (pinned to `pnpm@11.20.0`).

| Command                         | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `pnpm install`                  | Install workspace dependencies.                                |
| `pnpm dev`                      | Playground at <http://localhost:5173>.                         |
| `pnpm build`                    | Build the playground.                                          |
| `pnpm check`                    | **Main gate** — lint + fmt:check + typecheck + test.           |
| `pnpm lint` / `pnpm lint:fix`   | oxlint (type-aware via oxlint-tsgolint).                       |
| `pnpm fmt` / `pnpm fmt:check`   | oxfmt (sorts imports and package.json).                        |
| `pnpm typecheck`                | `tsc --noEmit` for the root workspace and `tools/framer-sync`. |
| `pnpm test` / `pnpm test:watch` | Vitest + Testing Library (jsdom).                              |

`.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile` then lint,
fmt:check, typecheck, test and build on Node 24. Run `pnpm check` before
declaring work done.

Framer sync commands need credentials or a saved Framer authorization — don't run
them in unattended contexts without one (flags: [tools/framer-sync/README.md](tools/framer-sync/README.md)):

| Command                                             | Purpose                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm framer:sync`                                  | Create/update code files via the Server API (`.env`: `FRAMER_API_KEY`, `FRAMER_PROJECT_URL` — see `.env.example`). |
| `pnpm framer:typecheck`                             | Typecheck with Framer's own TypeScript service.                                                                    |
| `pnpm framer:install` / `pnpm framer:install:check` | Same via `@framer/agent`, reusing machine authorization (no API key).                                              |

## Layout

```text
src/components/    one .tsx file per Framer code component
src/overrides/     one .tsx file per set of override exports
src/mock/          local runtime for the types-only `framer` npm package
apps/playground/   Vite app that renders components against the mock
tools/framer-sync/ CLI that syncs code files into a Framer project
test/setup.ts      jsdom stubs (IntersectionObserver, ResizeObserver, matchMedia)
```

## Framer code-file rules

Enforced by Framer, verified with `pnpm framer:typecheck`:

- **Single self-contained file** — no cross-file imports; imports limited to
  `react`, `react-dom`, `framer`, `framer-motion` (absolute
  `https://esm.sh/...` URLs for extra packages).
- Components: exactly one **default export**, declared as a named `function`;
  no named exports. Overrides: typed functions returning `ComponentType<any>`;
  always spread incoming props, forward the ref and merge (don't replace) `style`.
- `position: relative` on the root element (never `fixed`); guard `window` /
  `document` for SSR; avoid Node-only types such as `Timeout`.
- `@framerSupportedLayoutWidth` / `@framerSupportedLayoutHeight` annotations go
  directly above the component.
- Tests live next to the source as `<Name>.test.tsx`; the sync tool skips
  `.test.` files, and Vitest only collects `src/**/*.test.{ts,tsx}`.

Authoring walkthroughs: [src/components/README.md](src/components/README.md),
[src/overrides/README.md](src/overrides/README.md).

## Repository conventions

- **Versions live in catalogs.** Change versions only in `pnpm-workspace.yaml`
  and reference them from `package.json` with `"catalog:"` — never inline a
  version in a workspace package.
- **`@/` alias** resolves to `src/` in TypeScript, Vite and Vitest
  (`@/components`, `@/overrides`, `@/mock`).
- **`framer` is types-only on npm.** The playground and Vitest alias `framer` to
  `src/mock/index.tsx`; extend the mock when adopting more of the API and keep
  it in sync with the real types.
- React is pinned to 18.3.1 and `framer-motion` to 12.34.3 to match the Framer
  runtime — don't bump them casually.
- Fix `pnpm fmt` / `pnpm lint` findings instead of hand-editing formatting;
  lint/format exceptions live in `oxlint.config.ts`.
- Framer authoring guidance ships in
  `node_modules/@framer/agent/skills/framer-code-components/SKILL.md`; query API
  signatures with `pnpm exec agent docs <Type>`.
