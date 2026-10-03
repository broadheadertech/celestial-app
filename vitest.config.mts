import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Backend tests run Convex functions in-memory with convex-test (tests/convex/*).
// Pure storefront helpers live in tests/site/*; component render tests (*.tsx) use
// react-dom/server, so the `@/…` alias the app uses has to resolve here too.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  // Match the app: JSX via the automatic runtime, so tests needn't import React.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    testTimeout: 30_000,
  },
});
