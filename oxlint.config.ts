import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "jsx-a11y", "import", "unicorn", "oxc", "typescript", "vitest"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
    pedantic: "off",
  },
  ignorePatterns: ["**/dist/**", "**/coverage/**"],
  rules: {
    // The automatic JSX runtime makes this rule obsolete.
    "react/react-in-jsx-scope": "off",
  },
  overrides: [
    {
      files: ["src/**", "apps/**", "test/**"],
      env: { browser: true },
    },
    {
      files: ["tools/**", "*.config.ts", "apps/*/vite.config.ts"],
      env: { node: true },
    },
    {
      // Side-effect imports are intentional: CSS and test setup.
      files: ["test/**", "apps/playground/src/main.tsx"],
      rules: { "import/no-unassigned-import": "off" },
    },
    {
      // Tests deliberately re-add props that the bare `ComponentType` of
      // overrides erases, to exercise the wrapped layer.
      files: ["**/*.test.{ts,tsx}"],
      rules: { "typescript/no-unsafe-type-assertion": "off" },
    },
    {
      // Framer overrides wrap arbitrary canvas layers, so `any` is the
      // pragmatic type for the wrapped component; the mock mirrors the
      // loosely typed parts of the real `framer` runtime.
      files: ["src/overrides/**", "src/mock/**"],
      rules: { "typescript/no-explicit-any": "off" },
    },
    {
      files: ["tools/**", "**/*.test.{ts,tsx}"],
      rules: { "no-console": "off" },
    },
  ],
  options: {
    typeAware: true,
  },
});
