import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FIREBASE_HOSTS = 'https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com'
const CLOUDINARY_HOSTS = 'https://api.cloudinary.com https://res.cloudinary.com'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['react-is'],
  },
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
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `connect-src 'self' ${FIREBASE_HOSTS} ${CLOUDINARY_HOSTS}`,
        `img-src 'self' data: blob: ${CLOUDINARY_HOSTS}`,
        `font-src 'self' https://fonts.gstatic.com`,
        `frame-ancestors 'none'`,
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
