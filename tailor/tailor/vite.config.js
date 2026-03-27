import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // DEV (local)
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    }
  },

  // ✅ ADD THIS (for Render / production)
  preview: {
    host: true,
    port: process.env.PORT,
    allowedHosts: 'all'
  }
})