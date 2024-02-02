import { readdir } from 'fs/promises'
import { join } from 'path'
import typescript from '@rollup/plugin-typescript'
import { autoExports } from 'rollup-plugin-auto-exports'

const input = (await readdir('src', { recursive: true }))
  .map((file) => join('src', file))
  .filter((file) => file.endsWith('.ts'))

export default {
  input,
  output: {
    format: 'es',
    dir: 'exports'
  },
  plugins: [typescript(), autoExports()]
}
