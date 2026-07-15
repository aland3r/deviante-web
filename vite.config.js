import { defineConfig, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gestaltDevQuest } from '../../ui/dev-quest/vite-gestalt.js'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@gestalt/tokens': path.resolve(rootDir, '../../tokens'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      allowedHosts: ['deviante.alander.io', '.alander.io'],
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
  }),
  defineConfig(gestaltDevQuest(rootDir)),
)
