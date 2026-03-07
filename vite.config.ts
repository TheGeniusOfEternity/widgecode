import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/github-stats/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      input: {
        stats: fileURLToPath(new URL('./stats.html', import.meta.url)),
        langs: fileURLToPath(new URL('./langs.html', import.meta.url))
      }
    }
  }
})