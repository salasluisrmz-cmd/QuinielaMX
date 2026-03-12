import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qennyxeehbnzgbhgyzkz.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3atsH6xM4taOmuiOJNnKfQ_Cf5Wng3P'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Evita CORS en desarrollo: el navegador llama a mismo origen y Vite reenvía a Supabase
      '/api/sync-resultados': {
        target: SUPABASE_URL,
        changeOrigin: true,
        rewrite: (path) => '/functions/v1/sync-resultados',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
            proxyReq.setHeader('apikey', SUPABASE_ANON_KEY)
          })
        },
      },
    },
  },
})
