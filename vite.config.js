import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        svelte(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
                name: 'Hydranten.EU',
                short_name: 'hydranten',
                start_url: '.',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#317EFB',
                icons: [
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
                ]
            },
            workbox: {
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'osm-tiles',
                            expiration: {
                                maxEntries: 1000,
                                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/.*\.hydranten\.eu\/images/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'app-images',
                            expiration: {
                                maxEntries: 1000,
                                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    }
                ]
            }
        })
    ]
})
