import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["manifest.json", "icons/*.png"],
      manifest: {
        name: "Buku & Biodata Alumni Ponpes",
        short_name: "Alumni Ponpes",
        description: "Sistem pendataan biodata & buku alumni pondok pesantren",
        theme_color: "#0f766e",
        background_color: "#f0fdfa",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache" },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "./src/server"),
      "@client": path.resolve(__dirname, "./src/client"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    allowedHosts: ["tu-pc", "localhost", ".local"],
    host: true,
    watch: {
      ignored: ["**/.wrangler/**"],
    },
  },
});
