import { SupportedType, ValueForType } from './types.js'

export const stringToType = <Type extends SupportedType>(string: string, type: Type): ValueForType<Type> => {
  if (type === Boolean) return (string === 'true') as ValueForType<Type>
  if (type === Number) return Number(string) as ValueForType<Type>
  if (type === Uint8Array) return new Uint8Array(string.split(',').map(Number)) as ValueForType<Type>
  if (type === Array || type === Object) return JSON.parse(string) as ValueForType<Type>
  if (type === Map) return new Map(JSON.parse(string)) as ValueForType<Type>
  if (type === WeakMap) return new WeakMap(JSON.parse(string)) as ValueForType<Type>
  return string as ValueForType<Type>
}

export const typeToString = (type: SupportedType, value: any): string => {
  if (type === WeakMap) throw new TypeError('WeakMap properties cannot reflect to attributes')
  if (type === Map) return JSON.stringify([...value])
  if (type === Array || type === Object) return JSON.stringify(value)
  return value.toString()
}
