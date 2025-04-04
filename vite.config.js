import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,  // Listen on all addresses, including [::] (IPv6)
    port: 8080    // Set the port to 8080
  }
})
