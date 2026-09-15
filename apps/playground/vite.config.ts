import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The real `framer` package only ships types. Locally we render components
// against src/mock so they can be previewed outside the Framer editor.
const srcRoot = fileURLToPath(new URL("../../src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/mock": fileURLToPath(new URL("../../src/mock/index.tsx", import.meta.url)),
      "@": srcRoot,
      framer: fileURLToPath(new URL("../../src/mock/index.tsx", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
});
