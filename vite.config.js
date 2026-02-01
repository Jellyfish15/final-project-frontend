import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = "/final-project-frontend/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png", "robots.txt"],
      manifest: {
        name: "Nudl - Educational Videos",
        short_name: "Nudl",
        description: "Discover and learn with educational videos on Nudl",
        theme_color: "#646cff",
        background_color: "#242424",
        display: "standalone",
        orientation: "portrait-primary",
        scope: base,
        start_url: base,
        icons: [
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["education", "video", "learning"],
        shortcuts: [
          {
            name: "Watch Videos",
            short_name: "Videos",
            description: "Watch educational videos",
            url: `${base}videos`,
            icons: [{ src: "icons/icon-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Search Videos",
            short_name: "Search",
            description: "Search for educational content",
            url: `${base}search`,
            icons: [{ src: "icons/icon-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/youtube\/v3\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "youtube-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "youtube-thumbnails-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
