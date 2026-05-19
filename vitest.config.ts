import { defineConfig } from "vitest/config";
import path from "path";

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          globals: true,
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          // Integration tests share one database — run files serially.
          fileParallelism: false,
          hookTimeout: 30_000,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
