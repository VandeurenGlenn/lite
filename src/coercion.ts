export const stringToType = (string, type) => {
  if (type === Boolean) return string === 'true'
  if (type === Number) return Number(string)
  if (type === Uint8Array) return new Uint8Array(string.split(','))
  if (type === Array || type === Object) return JSON.parse(string)
  if (type === Map) return new Map(JSON.parse(string))
  if (type === WeakMap) return new WeakMap(JSON.parse(string))
  return string
}

export const typeToString = (type, value) => {
  if (type === WeakMap) throw new TypeError('WeakMap properties cannot reflect to attributes')
  if (type === Map) return JSON.stringify([...value])
  if (type === Array || type === Object) return JSON.stringify(value)
  return value.toString()
}
