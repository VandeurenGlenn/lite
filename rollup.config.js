import { cp, glob, readdir } from 'fs/promises'
import { join } from 'path'
import typescript from '@rollup/plugin-typescript'
import { autoExports } from 'rollup-plugin-auto-exports'
import size from 'rollup-plugin-size'
import terser from '@rollup/plugin-terser'
import { unlink } from 'fs/promises'
import { parse } from 'path'

try {
  const exports = await glob('exports/**/*')

  for await (const file of exports) {
    if (parse(file).ext === '') continue

    await unlink(file)
  }
} catch (error) {
  console.error('Error cleaning up exports directory:', error)
}

try {
  await cp('./src/demo', './exports/demo', {
    recursive: true,
    force: true
  })
} catch (error) {}

const input = (await readdir('src', { recursive: true }))
  .map((file) => join('src', file))
  .filter((file) => file.endsWith('.ts') || file.endsWith('cli.ts'))

export default [
  {
    input: ['src/cli/cli.ts'],
    output: {
      format: 'es',
      dir: 'exports/cli',
      banner: '#!/usr/bin/env node'
    },

    plugins: [typescript({ compilerOptions: { outDir: 'exports/cli' } })]
  },
  {
    input,
    output: {
      format: 'es',
      dir: 'exports'
    },
    plugins: [typescript(), autoExports(), size(), terser()]
  }
]
