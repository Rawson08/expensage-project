import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // Import the PWA plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ // Add PWA plugin configuration
      registerType: 'autoUpdate', // Automatically update service worker
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Include essential icons
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
      // Optional: Configure service worker strategies (e.g., caching)
      // workbox: {
      //   globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      // }
    })
  ],
  server: { // Add server configuration
      host: true, // Listen on all addresses (0.0.0.0)
      port: 5173 // Optional: Keep default port or change if needed
  },
  // Rely on postcss.config.js for PostCSS setup
})
