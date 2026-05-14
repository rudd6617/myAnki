import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [cloudflare()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@shared": resolve(__dirname, "shared"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ["sql.js"],
  },
});
