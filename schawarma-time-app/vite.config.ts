import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_HOST = 'https://*.supabase.co'
const CLOUDINARY_HOSTS = 'https://api.cloudinary.com https://res.cloudinary.com'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      // Content Security Policy — restricts where scripts, styles, and data can load from.
      // NOTE: For production, set these headers in your hosting platform (Netlify/Vercel/Nginx).
      'Content-Security-Policy': [
        `default-src 'self'`,
        `script-src 'self' 'unsafe-inline'`,   // unsafe-inline needed for Vite HMR in dev
        `style-src 'self' 'unsafe-inline'`,
        `connect-src 'self' ${SUPABASE_HOST} wss://*.supabase.co ${CLOUDINARY_HOSTS}`,
        `img-src 'self' data: blob: ${SUPABASE_HOST} ${CLOUDINARY_HOSTS}`,
        `font-src 'self'`,
        `frame-ancestors 'none'`,
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
