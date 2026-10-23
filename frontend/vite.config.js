import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// /api requests go to the Node server that runs the Verilog simulation
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
