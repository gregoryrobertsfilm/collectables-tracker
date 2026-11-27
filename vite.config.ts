/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { checkBuildSettings } from './src/lib/build-guard.ts'

// fileURLToPath copes with the space in this folder's name.
const root = fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/**
 * Gives every build a unique id and writes it to /version.json, so an app left open on the
 * phone can notice that a newer version has been published (see src/lib/version.ts).
 */
function buildId(): Plugin {
  let id = 'dev'
  return {
    name: 'collectables-build-id',
    config(_config, env) {
      if (env.command === 'build') {
        id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
      }
      return { define: { __BUILD_ID__: JSON.stringify(id) } }
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: id }) + '\n' })
    },
  }
}

/**
 * Stops the build if the database settings would publish a secret or point the app at the
 * wrong place (see src/lib/build-guard.ts). Deploy builds (DEPLOY=1, set by the deploy
 * scripts in package.json) must be fully set up; ordinary builds may have no settings yet.
 */
function settingsGuard(): Plugin {
  return {
    name: 'collectables-settings-guard',
    config(_config, env) {
      if (env.command !== 'build') return
      const viteEnv = loadEnv(env.mode, root, 'VITE_')
      const envFiles = readdirSync(root).filter((name) => name === '.env' || name.startsWith('.env.'))
      const problems = checkBuildSettings({ viteEnv, envFiles, forDeploy: process.env.DEPLOY === '1' })
      if (problems.length > 0) {
        throw new Error(`\n\nBuild stopped. Nothing was published.\n\n${problems.map((p) => `  • ${p}`).join('\n')}\n`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [settingsGuard(), react(), tailwindcss(), buildId()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    // Money maths and import logic are plain functions, so tests run without a browser.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
