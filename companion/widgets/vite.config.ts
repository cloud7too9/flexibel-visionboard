import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Die App läuft unter /dashboard/ – so liefert sie später auch der Board-Server aus (Phase A6).
export default defineConfig({
  base: "/dashboard/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
  },
});
