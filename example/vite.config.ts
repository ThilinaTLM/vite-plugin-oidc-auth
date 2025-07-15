import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import oidcPlugin from 'vite-plugin-oidc-auth'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), oidcPlugin()],
})
