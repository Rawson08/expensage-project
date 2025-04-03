import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // Import the PWA plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Switch strategy to use our custom SW
      strategies: 'injectManifest',
      srcDir: 'src', // Directory where sw.ts is located
      filename: 'sw.ts', // Our custom service worker filename
      registerType: 'autoUpdate',
      injectRegister: 'auto', // Automatically adds registration code to the app
      // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Keep assets if needed
      manifest: {
        name: 'ExpenSage',
        short_name: 'ExpenSage',
        description: 'Smart expense sharing and receipt scanning',
        theme_color: '#ffffff', // Example theme color
        background_color: '#ffffff', // Example background color
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'web-app-manifest-192x192.png', // Updated filename
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'web-app-manifest-512x512.png', // Updated filename
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'web-app-manifest-512x512.png', // Updated filename (Maskable icon)
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          }
        ],
      },
      // workbox options are used by injectManifest strategy by default
      // You can customize workbox options here if needed, e.g., for precaching
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'], // Precache common assets
        // runtimeCaching: [ ... ] // Add runtime caching if needed
      },
      devOptions: {
        enabled: true, // Enable PWA features in dev mode
        type: 'module', // Use module type for SW in dev
      }
    })
  ],
  server: { // Add server configuration
      host: true, // Listen on all addresses (0.0.0.0)
      port: 5173 // Optional: Keep default port or change if needed
  },
  // Rely on postcss.config.js for PostCSS setup
})
