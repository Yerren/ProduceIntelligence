import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite' 
import pdfThumbnail from './vite-plugins/pdfThumbnail.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
    pdfThumbnail(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router'], 
  },
})
