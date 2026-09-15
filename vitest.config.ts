import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Everything that imports from "framer" gets the local mock at runtime, while
// TypeScript keeps using the real (types-only) `framer` package.
const framerMock = fileURLToPath(new URL("./src/mock/index.tsx", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/mock": framerMock,
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      framer: framerMock,
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
