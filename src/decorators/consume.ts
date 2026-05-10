// @consume('channel') is an alias for @property({ consumes: 'channel' })
import { property } from './property.js'
export function consume(channel: string, options: Record<string, any> = {}) {
  return property({ ...options, consumes: channel })
}
