import { SupportedTypes } from './types.js'

export const stringToType = (string, type) => {
  let value: SupportedTypes = string
  if (type === Boolean) value = Boolean(string === 'true')
  else if (type === Number) value = Number(string)
  else if (type === Uint8Array) value = new Uint8Array(string.split(','))
  else if (type === Array || type === Object || type === WeakMap || type === Map || type === Uint8Array) {
    value = JSON.parse(string)
    if (type === Map) value = new Map(string)
    if (type === WeakMap) value = new WeakMap(string)
  }
  return value
}

export const typeToString = (type: SupportedTypes, value: SupportedTypes) => {
  let string = value
  if (type === Boolean || type === Number || type === Uint8Array) return value.toString()
  else if (type === Array || type === Object || type === WeakMap || type === Map || type === Uint8Array) {
    let array
    if (type === Map || type === WeakMap) array = Object(value).entries()
    string = JSON.stringify(array)
  }
  return string
}
