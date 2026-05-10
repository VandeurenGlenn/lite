import LittlePubSub from '@vandeurenglenn/little-pubsub'

const pubsub = new LittlePubSub()

export interface Store<T> {
  get(): T
  set(updates: Partial<T>): void
  subscribe(callback: (state: T) => void): () => void
}

export function createStore<T extends Record<string, unknown>>(initialState: T): Store<T> {
  let state: T = initialState
  return {
    get() {
      return state
    },
    set(updates) {
      state = { ...state, ...updates }
      pubsub.emit('store-changed', state)
    },
    subscribe(callback) {
      pubsub.on('store-changed', callback)
      return () => pubsub.off('store-changed', callback)
    }
  }
}
