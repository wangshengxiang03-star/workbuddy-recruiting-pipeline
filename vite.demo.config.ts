import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/workbuddy-recruiting-pipeline/",
  root: "demo",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-demo",
    emptyOutDir: true,
  },
});
