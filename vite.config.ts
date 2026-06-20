import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

/** Load extracted app CSS without blocking first paint — index.html carries the LCP skeleton. */
function deferAppCss(): Plugin {
  return {
    name: "defer-app-css",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        let out = html.replace(
          /<link rel="stylesheet" crossorigin href="(\/assets\/index-[^"]+\.css)">/,
          [
            '<link rel="preload" href="$1" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">',
            "<noscript><link rel=\"stylesheet\" href=\"$1\"></noscript>",
          ].join("\n    ")
        );
        const jsTag = out.match(
          /<script type="module" crossorigin src="(\/assets\/index-[^"]+\.js)"><\/script>/,
        );
        if (jsTag) {
          out = out.replace(jsTag[0], "");
          out = out.replace(
            /<\/body>/,
            `    <script type="module" crossorigin src="${jsTag[1]}"></script>\n  </body>`,
          );
        }
        return out;
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    tailwindcss(),
    deferAppCss(),
    VitePWA({
      injectRegister: null,
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Today — every day counts",
        short_name: "Today",
        description:
          "A finite-time journal. Confronts you with how much life is left so today doesn't slip by.",
        theme_color: "#e86a1f",
        background_color: "#faf6ec",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  // Fleet standard (VoidZero ecosystem) — Lightning CSS as the CSS
  // transformer + minifier. Rust-based, much faster than Vite's default
  // PostCSS pipeline, marginally smaller output, identical browser
  // output for the rules Tailwind v4 emits.
  css: {
    transformer: "lightningcss",
    lightningcss: {
      // Match the autoprefixer target Vite's default would have applied.
      // Without this Lightning CSS falls back to its own default browser
      // set which is slightly newer and could drop prefixes some older
      // mobile browsers need.
      drafts: { customMedia: true },
    },
  },
  build: {
    modulePreload: false,
    cssMinify: "lightningcss",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
