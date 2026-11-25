import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Cho phép điện thoại cùng mạng Wifi truy cập qua IP máy tính
    proxy: {
      // Forward mọi request /api sang backend Express (port 3000)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
