import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base is "/" locally; the GitHub Pages workflow sets VITE_BASE_PATH to
// "/hangar-etch-studio/" (drop it once a custom domain is attached).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
});
