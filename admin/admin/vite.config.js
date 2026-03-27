import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "development"
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ✅ DEV (local only)
  server: {
    host: "::",
    port: 8081,
  },

  // ✅ PRODUCTION (Render)
  preview: {
    host: true,
    port: process.env.PORT,
    allowedHosts: "all"
  }
}));