export type SupportedTypes =
  | String
  | Boolean
  | Object
  | Array<any>
  | Number
  | Map<any, any>
  | WeakMap<any, any>
  | Uint8Array

/**
 * @example
 * ```js
 * class MyElement extends HTMLElement {
 *  @property({onchange = (value) => value})
 *  open
 * }
 *
 * ```
 */
export type PropertyOptions = {
  type?: SupportedTypes
  reflect?: boolean
  attribute?: string
  renders?: boolean
  value?: string | [] | {} | number | boolean | Map<any, any> | WeakMap<any, any> | Uint8Array
  batches?: boolean
  batchDelay?: number
}

const defaultOptions: PropertyOptions = {
  type: String,
  reflect: false,
  renders: true,
  batchDelay: 50
}

const stringToType = (string, type) => {
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

const typeToString = (type, value) => {
  let string: SupportedTypes = value
  if (type === Boolean || type === Number || type === Uint8Array) return value.toString()
  else if (type === Array || type === Object || type === WeakMap || type === Map || type === Uint8Array) {
    let array: []
    if (type === Map || type === WeakMap) array = Object(value).entries()
    string = JSON.stringify(array)
  }
  return string
}

export const property = (options?: PropertyOptions) => {
  options = { ...defaultOptions, ...options }
  return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
    const { type, reflect, attribute, renders, batches, batchDelay } = options
    const attributeName = attribute || propertyKey

    const isBoolean = type === Boolean
    // let timeoutChange

    function get() {
      return reflect
        ? isBoolean
          ? this.hasAttribute(attributeName)
          : stringToType(this.getAttribute(attributeName), type)
        : target[`_${propertyKey}`]
    }

    async function set(value) {
      const set = async () => {
        if (this.willChange) value = await this.willChange(propertyKey, value)

        if (target[`_${propertyKey}`] !== value) {
          if (reflect)
            if (isBoolean)
              if (value) this.setAttribute(attributeName, '')
              else this.removeAttribute(attributeName)
            else if (value) this.setAttribute(attributeName, typeToString(type, value))
            else this.removeAttribute(attributeName)
          // only store data ourselves when really needed
          else target[`_${propertyKey}`] = value
        }
        if (this.requestRender && renders) this.requestRender()
        if (this.onChange) await this.onChange(propertyKey, value)
      }

      if (batches) {
        if (target[`_${propertyKey}_timeout`]) clearTimeout(target[`_${propertyKey}_timeout`])
        target[`_${propertyKey}_timeout`] = setTimeout(set, batchDelay)
      } else set()
    }

    if (!descriptor) {
      Object.defineProperty(target, propertyKey, {
        get,
        set
      })
    } else {
      descriptor.get = get
      descriptor.set = set
    }
  }
}
