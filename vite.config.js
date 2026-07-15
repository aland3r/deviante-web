import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { gestaltDevQuest } from './vendor/gestalt/ui/dev-quest/vite-gestalt.js'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function resolveGestaltRoot(webRootDir) {
  const monorepoRoot = path.resolve(webRootDir, '../..')
  if (fs.existsSync(path.join(monorepoRoot, 'ui/auth/index.js'))) {
    return monorepoRoot
  }

  const vendorRoot = path.resolve(webRootDir, 'vendor/gestalt')
  if (fs.existsSync(path.join(vendorRoot, 'ui/auth/index.js'))) {
    return vendorRoot
  }

  throw new Error(
    'Gestalt shared packages not found. Run from the monorepo or keep vendor/gestalt in the repo.',
  )
}

const gestaltRoot = resolveGestaltRoot(rootDir)

export default mergeConfig(
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@gestalt/tokens': path.resolve(gestaltRoot, 'tokens'),
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
  defineConfig(gestaltDevQuest(rootDir, gestaltRoot)),
)
