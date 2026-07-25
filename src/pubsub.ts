import LittlePubSub from '@vandeurenglenn/little-pubsub'

declare global {
  var pubsub: LittlePubSub
}

export const pubsub = globalThis.pubsub || (globalThis.pubsub = new LittlePubSub())
