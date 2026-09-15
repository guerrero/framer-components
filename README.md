# Framer components monorepo

A pnpm monorepo for developing **Framer code components** and **code overrides**
outside of Framer, with type checking, linting, tests, a local playground and a
one-command sync into a Framer project through the Framer Server API.

## Why this shape?

Framer code files have hard runtime constraints, and the npm `framer` package
only ships **types** — the real runtime lives in the Framer editor. This repo is
built around both facts:

| Constraint                                                             | Consequence in this repo                                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Code files are **single-file modules**                                 | Each component/override is one self-contained `.tsx` file — no cross-file imports.              |
| Imports are limited to `react`, `react-dom`, `framer`, `framer-motion` | Shared dependencies are imported from absolute URLs (e.g. `https://esm.sh/...`) when needed.    |
| Overrides are detected via **TypeScript types** (`ComponentType`)      | Source is the artifact: files are synced as TSX, never bundled, so Framer keeps type detection. |
| `framer` is **types-only** on npm                                      | `src/mock` provides a tiny runtime that is aliased in Vite/Vitest.                              |
| Code files live in the project                                         | `tools/framer-sync` pushes files with the Server API (`createCodeFile` / `setFileContent`).     |

## Layout

```
src/components/           One .tsx file per Framer code component
src/overrides/            One .tsx file per set of override exports
src/mock/                 Local runtime for the `framer` module
apps/playground/          Vite app that renders components against the mock
tools/framer-sync/        CLI that syncs code files into a Framer project
test/setup.ts             jsdom stubs (IntersectionObserver, ResizeObserver, …)
```

## Quick start

```bash
pnpm install
pnpm dev        # playground at http://localhost:5173
pnpm check      # lint + format check + typecheck + tests
```

Individual commands: `pnpm lint`, `pnpm lint:fix`, `pnpm fmt`, `pnpm fmt:check`,
`pnpm typecheck`, `pnpm test`, `pnpm test:watch`, `pnpm build`.

## Adding a component

Create `src/components/MyComponent.tsx`:

```tsx
import { addPropertyControls, ControlType } from "framer";

interface MyComponentProps {
  /** Shown in the Framer property panel. */
  title?: string;
}

/**
 * @framerSupportedLayoutWidth auto-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function MyComponent({ title = "Hello" }: MyComponentProps) {
  return <div style={{ position: "relative" }}>{title}</div>;
}

addPropertyControls(MyComponent, {
  title: { type: ControlType.String, title: "Title", defaultValue: "Hello" },
});
```

Checklist (enforced by Framer, verified by `pnpm framer:typecheck`):

- Single file, one **default export**, declared as a named `function`.
- No named exports in component files.
- Only `react`, `react-dom`, `framer`, `framer-motion` imports.
- `position: relative` on the root element (never `fixed`).
- Guard `window` / `document` access for SSR.
- Typed props interface; avoid Node-only types such as `Timeout`.
- `@framerSupportedLayoutWidth/Height` annotations directly above the component.

Add a `MyComponent.test.tsx` next to it and (optionally) a demo in the playground.

## Adding an override

Create `src/overrides/withMyBehavior.tsx`:

```tsx
import type { ComponentType } from "react";
import { forwardRef } from "react";

/** Framer detects overrides from the `ComponentType` return type. */
export function withMyBehavior(Component: ComponentType<any>): ComponentType {
  return forwardRef(function WithMyBehavior(props, ref) {
    return <Component ref={ref} {...props} style={{ ...props.style, opacity: 0.5 }} />;
  });
}
```

Always spread the incoming props, forward the ref and merge (don't replace)
`style`. A file may export several overrides — Framer lists each one.

## Local preview and tests

The playground and Vitest alias `framer` to `src/mock/index.tsx`,
which implements the parts of the runtime this repo uses:

- `addPropertyControls` / `ControlType` (registered controls are inspectable via
  `getPropertyControls(component)` — the playground renders them),
- `Frame`, `Stack`, `Link`,
- `useIsStaticRenderer`, `isStaticRenderer`, `setStaticRenderer` (toggle the
  static/canvas path from tests), `useIsOnFramerCanvas`, `RenderTarget`.

Extend the mock as you adopt more of the API — keep the values in sync with the
real types. TypeScript keeps using the real `framer` types, so components are
checked exactly as Framer would check them.

## Syncing to Framer

1. In Framer, open the target project → `Cmd+K` → **Open Settings** → **API Keys**
   → create a key.
2. Copy `.env.example` to `.env` and fill in `FRAMER_API_KEY` and
   `FRAMER_PROJECT_URL`.
3. Run:

```bash
pnpm framer:sync                  # create/update code files
pnpm framer:sync -- --dry-run     # show what would change
pnpm framer:check                 # exit 1 when the project differs (CI friendly)
pnpm framer:typecheck             # typecheck with Framer's own TypeScript service
```

### Installing with the Framer agent CLI

`@framer/agent` is a dev dependency, so the same files can be installed without
an API key by reusing the project authorization saved on your machine:

```bash
pnpm exec agent project auth <project-url>      # once (browser approval)
pnpm framer:install --project <project-url>     # install / update
pnpm framer:install:check --project <project-url>
```

The agent transport runs `session new` → one `exec` script that creates or
updates code files through the plugin API → `session destroy`, and prints the
exports Framer detected per file. `--session <id>` reuses a session and
`--keep-session` leaves it open. All other flags match `framer:sync`.

Files are mapped as:

```
src/components/PillButton.tsx    →  components/PillButton.tsx
src/overrides/withHoverLift.tsx  →  overrides/withHoverLift.tsx
```

The CLI reports which exports Framer detected (`default · component` vs
`override`), which doubles as a verification step for the type-based detection.

> `component sharing URLs` (`https://framer.com/m/...`) are how Framer
> distributes code components between projects — paste them onto the canvas or
> import them from other code files. npm publishing is only useful when
> consuming components in non-Framer React apps.

## Tooling

- **pnpm workspaces + catalogs** — the component library lives at the repo root
  (`src/`); `apps/*` and `tools/*` are workspace projects. Dependency versions
  live in `pnpm-workspace.yaml` and are referenced with `"catalog:"`.
- **`@/` alias** — `@/components`, `@/overrides` and `@/mock` resolve to `src/`
  in TypeScript, Vite and Vitest.
- **oxlint** (`oxlint.config.ts`) — React/hooks, jsx-a11y, import, unicorn,
  typescript and vitest rules; type-aware linting via `oxlint-tsgolint`.
- **oxfmt** (`.oxfmtrc.json`) — Prettier-compatible formatting plus import and
  `package.json` sorting.
- **Vitest + Testing Library** with `jsdom`, wired for React 18.
- **VS Code** — the `oxc.oxc-vscode` extension is recommended (format on save).

## Notes and next steps

- React is pinned to **18.3.1** and `framer-motion` to the version Framer ships
  (`12.34.3`), so local behavior matches the editor.
- To publish to npm later, re-split `src/` into workspace packages (with
  Changesets and a build step); keep code files themselves un-bundled for
  Framer.
- The agent's authoring guidance ships with the dependency at
  `node_modules/@framer/agent/skills/framer-code-components/SKILL.md`, and API
  signatures are queryable with `pnpm exec agent docs <Type>` or
  `pnpm exec agent docs <Class.method>`.
- Component Slots, event handlers and all `ControlType`s are typed by the real
  `framer` package — hover the types to see every available option.
