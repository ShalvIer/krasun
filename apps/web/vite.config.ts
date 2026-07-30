import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: { sourcemap: true },
  plugins: [react()],
  server: { port: 5173, host: "0.0.0.0" },
  preview: { port: 5173, host: "0.0.0.0" },
  test: { environment: "jsdom", setupFiles: "./src/test/setup.ts", css: true }
});
