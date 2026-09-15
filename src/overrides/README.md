# Overrides

Framer **code overrides**: higher-order components that modify a layer.

- Export typed functions whose return type is `ComponentType` — Framer detects
  overrides from the TypeScript types.
- Always spread the incoming props, forward the ref and merge (don't replace)
  `style`.
- Multiple overrides can live in one file; Framer lists each export.

```bash
pnpm framer:sync  # push them to Framer as overrides/<name>.tsx
```

The playground imports them through the `@/overrides/*` alias.
