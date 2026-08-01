import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
// not from the domain root, so the build needs to know that subpath — Vite
// (and the PWA manifest below) uses this to rewrite every asset URL.
// CHANGE "textile-app-project" to your GitHub repo's exact name.
// If you deploy to a user/org page instead (a repo literally named
// "<your-username>.github.io"), set this to '/' instead.
const REPO_NAME = '/' // user page (raihanfabrics.github.io) — serves from the root, no subpath needed

export default defineConfig({
  base: '/',   // raihanfabrics.github.io is a user page — always serves from the root
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Lets the service worker run in `npm run dev` too, not just in a
      // production build — useful for testing offline behavior locally.
      devOptions: { enabled: true },
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Raihan Fabrics',
        short_name: 'Raihan Fabrics',
        description: 'Browse plain textiles, match a fabric swatch, and manage wholesale orders.',
        theme_color: '#0B3B32',
        background_color: '#EDE8DF',
        display: 'standalone',
        // Relative paths (no leading "/") so these resolve correctly
        // whether the app is served from the domain root or from a GitHub
        // Pages subpath like /textile-app-project/.
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell (HTML/JS/CSS/icons) so the app opens
        // and is fully browsable offline after the first visit.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            // Google Fonts — cache once, reuse forever offline.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Supabase data — show cached data instantly, refresh in the
            // background when online. Falls back to cache when offline.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-data-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
})
