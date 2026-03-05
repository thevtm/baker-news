import { defineConfig } from "vite";

import react from "@vitejs/plugin-react-swc";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import checker from "vite-plugin-checker";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: false }),
    react(),
    vanillaExtractPlugin(),
    checker({ typescript: true }),
  ],
});
