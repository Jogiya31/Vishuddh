import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/generate-combined-report': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true, // Ensures that the origin is correctly set for the target server
        secure: false,      // Set to false if the server doesn't support https
      },
    },
  },
})
