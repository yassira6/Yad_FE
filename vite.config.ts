import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PORT = Number(process.env.PORT) || 8787

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
})
