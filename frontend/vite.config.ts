import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The judge-facing build is served from https://velluz-dev.github.io/NASA/ (a fork of the team repo; same /NASA/ path).
// The FastAPI backend is optional: the static build falls back to snapshot.json.
export default defineConfig(({ mode }) => ({
  // The judge-facing build is served from https://velluz-dev.github.io/NASA/ (a fork of the team repo; same /NASA/ path).
  // The FastAPI backend is optional: the static build falls back to snapshot.json.
  base: mode === 'production' ? '/NASA/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
}))
