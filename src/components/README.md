# Components

One Framer **code component** per `.tsx` file. Each file is a standalone module
that follows the Framer platform constraints (see the root README):

- single file, one default-exported named `function`,
- imports limited to `react`, `react-dom`, `framer`, `framer-motion`,
- `position: relative` root, SSR guards, layout annotations.

```bash
pnpm dev          # preview them locally in the playground
pnpm framer:sync  # push them to Framer as components/<Name>.tsx
```

Add tests as `<Name>.test.tsx` next to the component; `.test.` files are skipped
by the sync tool. The playground imports them through the `@/components/*`
alias.
