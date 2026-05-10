// @provide('channel') is an alias for @property({ provides: 'channel' })
import { property } from './property.js'
export function provide(channel: string, options: Record<string, any> = {}) {
  return property({ ...options, provides: channel })
}
