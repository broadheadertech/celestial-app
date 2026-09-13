import { defineConfig } from "vitest/config";

// Backend tests run Convex functions in-memory with convex-test (tests/convex/*).
export default defineConfig({
  test: {
    include: ["tests/convex/**/*.test.ts"],
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    testTimeout: 30_000,
  },
});
