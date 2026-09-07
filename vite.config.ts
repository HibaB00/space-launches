import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // WHY: same alias as tsconfig "paths"; TypeScript resolves types with it, Vite resolves the actual files.
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // WHY: GitHub Pages serves a *project* site at https://<user>.github.io/space-launches/,
  // so asset URLs must carry that prefix or the browser requests /assets/... from the domain root and 404s.
  base: '/space-launches/',
})
