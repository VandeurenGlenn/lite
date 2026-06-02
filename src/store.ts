import LittlePubSub from '@vandeurenglenn/little-pubsub'

export interface Store<T> {
  get(): T
  set(updates: Partial<T>): void
  subscribe(callback: (state: T) => void): () => void
}

export function createStore<T extends Record<string, unknown>>(initialState: T): Store<T> {
  const pubsub = new LittlePubSub()
  let state: T = initialState
  return {
    get() {
      return state
    },
    set(updates) {
      state = { ...state, ...updates }
      pubsub.publish('store-changed', state)
    },
    subscribe(callback) {
      pubsub.subscribe('store-changed', callback)
      return () => pubsub.unsubscribe('store-changed', callback)
    }
  }
}
