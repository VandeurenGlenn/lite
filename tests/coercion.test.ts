import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { stringToType, typeToString } from '../src/coercion.js'

test('arrays and objects round-trip through JSON', () => {
  const array = ['one', 2]
  const object = { enabled: true, count: 3 }
  assert.equal(stringToType(typeToString(Array, array), Array), array)
  assert.equal(stringToType(typeToString(Object, object), Object), object)
})

test('maps round-trip as entry arrays', () => {
  const map = new Map<string, number>([
    ['one', 1],
    ['two', 2]
  ])
  assert.equal([...stringToType(typeToString(Map, map), Map)], [...map])
})

test('uint8 arrays retain their compact comma format', () => {
  const value = new Uint8Array([1, 2, 255])
  assert.is(typeToString(Uint8Array, value), '1,2,255')
  assert.equal(stringToType('1,2,255', Uint8Array), value)
})

test('weak maps reject impossible attribute serialization', () => {
  assert.throws(() => typeToString(WeakMap, new WeakMap()), /cannot reflect/)
})

test.run()
