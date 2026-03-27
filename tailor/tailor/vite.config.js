import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080, // Explicitly define the port for the tailor app
    proxy: {
      '/api': {
        // Proxy requests starting with /api to the backend server at port 4000.
        // This is primarily for development to avoid CORS issues.
        target: 'http://localhost:4000', 
        changeOrigin: true,
      },
    }
  }
})