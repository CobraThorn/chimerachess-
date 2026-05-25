import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Ignore mis-set Netlify VITE_CHIMERA_API_URL — production uses same-origin proxy only.
  define:
    mode === "production"
      ? { "import.meta.env.VITE_CHIMERA_API_URL": JSON.stringify("") }
      : undefined,
  server: {
    proxy: {
      "/api/openai": {
        target: "https://api.openai.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ""),
      },
      "/api/chimera": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api/chimera": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        ws: true,
      },
    },
  },
}));
