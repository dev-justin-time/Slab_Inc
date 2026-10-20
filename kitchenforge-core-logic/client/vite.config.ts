import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/intent": "http://localhost:3100",
      "/skills": "http://localhost:3100",
      "/health": "http://localhost:3100",
    },
  },
});
