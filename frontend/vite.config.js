// path: frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 添加这个代理配置
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:10223', // 指向你的 Go 后端
        changeOrigin: true,
      }
    }
  }
})