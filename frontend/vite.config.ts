import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // CRITICAL: Use relative paths so file:/// protocol and desktop webviews load assets properly
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true
  }
})
