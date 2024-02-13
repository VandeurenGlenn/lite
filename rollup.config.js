import { readdir } from 'fs/promises'
import { join } from 'path'
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import { autoExports } from 'rollup-plugin-auto-exports'
import size from 'rollup-plugin-size'

const input = (await readdir('src', { recursive: true }))
  .map((file) => join('src', file))
  .filter((file) => file.endsWith('.ts'))

export default {
  input,
  output: {
    format: 'es',
    dir: 'exports'
  },
  plugins: [typescript(), autoExports(), size(), resolve()]
}
