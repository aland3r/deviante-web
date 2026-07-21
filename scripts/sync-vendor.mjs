#!/usr/bin/env node
// Copies ui/auth, ui/dev-quest, ui/gamifier, and tokens from the monorepo
// into vendor/gestalt/ so `deviante-web` can build standalone (e.g. on Vercel,
// where the monorepo isn't checked out). No-ops if the monorepo isn't present.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const monorepoRoot = path.resolve(webRootDir, '../..')
const vendorRoot = path.join(webRootDir, 'vendor/gestalt')

if (!fs.existsSync(path.join(monorepoRoot, 'ui/auth/index.js'))) {
  console.log('[sync-vendor] monorepo not found next to deviante/, skipping (using existing vendor/gestalt)')
  process.exit(0)
}

const packages = ['ui/auth', 'ui/dev-quest', 'ui/gamifier', 'tokens']

for (const pkg of packages) {
  const src = path.join(monorepoRoot, pkg)
  const dest = path.join(vendorRoot, pkg)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(src, dest, { recursive: true })
  console.log(`[sync-vendor] ${pkg} -> vendor/gestalt/${pkg}`)
}
