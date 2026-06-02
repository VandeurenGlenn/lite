import { test } from 'uvu'
import * as assert from 'uvu/assert'
import './setup.js'
import { createStore } from '../src/index.js'

test('get returns the initial state', () => {
  const store = createStore({ count: 0, name: 'init' })
  assert.equal(store.get(), { count: 0, name: 'init' })
})

test('set merges updates into state', () => {
  const store = createStore({ count: 0, name: 'init' })
  store.set({ count: 5 })
  assert.equal(store.get(), { count: 5, name: 'init' })
  store.set({ name: 'changed' })
  assert.equal(store.get(), { count: 5, name: 'changed' })
})

test('set replaces state with a new object reference', () => {
  const store = createStore({ count: 0 })
  const before = store.get()
  store.set({ count: 1 })
  const after = store.get()
  assert.is.not(before, after)
})

test('subscribe receives the new state on set', () => {
  const store = createStore({ count: 0 })
  let received: { count: number } | undefined
  store.subscribe((state) => {
    received = state
  })
  store.set({ count: 42 })
  assert.equal(received, { count: 42 })
})

test('subscribe callback fires for each set', () => {
  const store = createStore({ count: 0 })
  const values: number[] = []
  store.subscribe((state) => values.push(state.count))
  store.set({ count: 1 })
  store.set({ count: 2 })
  store.set({ count: 3 })
  assert.equal(values, [1, 2, 3])
})

test('unsubscribe stops further notifications', () => {
  const store = createStore({ count: 0 })
  const values: number[] = []
  const unsubscribe = store.subscribe((state) => values.push(state.count))
  store.set({ count: 1 })
  unsubscribe()
  store.set({ count: 2 })
  assert.equal(values, [1])
})

test('get reflects state after subscriber notification', () => {
  const store = createStore({ count: 0 })
  let snapshot: { count: number } | undefined
  store.subscribe(() => {
    snapshot = store.get()
  })
  store.set({ count: 7 })
  assert.equal(snapshot, { count: 7 })
})

test('stores are isolated from each other', () => {
  const a = createStore({ count: 0 })
  const b = createStore({ count: 0 })
  const aValues: number[] = []
  a.subscribe((state) => aValues.push(state.count))
  b.set({ count: 99 })
  assert.equal(aValues, [])
  assert.equal(a.get(), { count: 0 })
})

test.run()
