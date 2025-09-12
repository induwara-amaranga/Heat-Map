import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/heatmap": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // optional:
        // secure: false,
        // rewrite: (path) => path.replace(/^\/heatmap/, "/heatmap"),
      },
    },
  },
});
