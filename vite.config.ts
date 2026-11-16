import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 24 * 60 * 60

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // App instalável: ícone na tela inicial e uso sem internet para o que já foi visto.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png', 'hydra-labs-selo-*.svg'],
      manifest: {
        name: 'Dex Lab · montador de time e comparador',
        short_name: 'Dex Lab',
        description: 'Monte seu time, veja fraquezas, velocidade e dano, compare status e explore a Pokédex.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1c1917',
        background_color: '#f7f5f2',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['sw-refresh.js'],
        runtimeCaching: [
          {
            // Dados da PokéAPI: usa o que tem guardado e atualiza por trás.
            urlPattern: /^https:\/\/pokeapi\.co\/api\/v2\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pokeapi',
              expiration: { maxEntries: 3000, maxAgeSeconds: 30 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Artes e sprites (não mudam): guardados de vez. Áudio fica fora para não quebrar Range requests.
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokeapi-midia',
              expiration: { maxEntries: 4000, maxAgeSeconds: 90 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fontes',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
