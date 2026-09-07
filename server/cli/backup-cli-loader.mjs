import { createJiti } from 'jiti'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  moduleCache: false
})

export function loadServerModule(path) {
  return jiti(join(root, path))
}
