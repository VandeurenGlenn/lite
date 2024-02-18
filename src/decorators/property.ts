import LittlePubSub from '@vandeurenglenn/little-pubsub'
import { ElementConstructor } from '../element.js'

globalThis.pubsub = globalThis.pubsub || new LittlePubSub()

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

@@ -22,19 +21,8 @@ export type SupportedTypes =
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
  provider?: boolean
  consumer?: boolean
}

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

const defaultOptions = {
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

const typeToString = (type: SupportedTypes, value: SupportedTypes) => {
  let string = value
  if (type === Boolean || type === Number || type === Uint8Array) return value.toString()
  else if (type === Array || type === Object || type === WeakMap || type === Map || type === Uint8Array) {
    let array
    if (type === Map || type === WeakMap) array = Object(value).entries()
    string = JSON.stringify(array)
  }
  return string
}

export const property = (options?: PropertyOptions) => {
  options = { ...defaultOptions, ...options }
  return function (ctor, { kind, name, addInitializer, access }: ClassAccessorDecoratorContext<ElementConstructor>) {
    const { type, reflect, attribute, renders, batches, batchDelay, consumer, provider } = options
    const attributeName = attribute || name
    const isBoolean = type === Boolean
    addInitializer(async function () {
      if (kind !== 'accessor') {
        console.warn(`${this.localName}: @property(${options}) ${String(name)} ${kind} is not supported`)
      }
      if (consumer) {
        globalThis.pubsub.subscribe(name, async (value) => {
          this[name] = value
        })
      }
    })
    if (kind === 'accessor') {
      return {
        get() {
          return get.call(this)
        },
        set(value) {
          return set.call(this, value)
        },
        init(value) {
          if (value !== undefined) set.call(this, value)
          if (consumer && globalThis.pubsub.subscribers?.[name]?.value)
            set.call(this, globalThis.pubsub.subscribers[name].value)
        }
      }
    }

    // let timeoutChange
    function get() {
      const value = reflect
        ? isBoolean
          ? this.hasAttribute(attributeName)
          : stringToType(this.getAttribute(attributeName), type)
        : this[`__${String(name)}`]
        ? this[`__${String(name)}`]
        : this[`_${String(name)}`]
      if (consumer && !this[`__${String(name)}`] && globalThis.pubsub.subscribers?.[String(name)]?.value) {
        if (value !== globalThis.pubsub.subscribers[name].value)
          set.call(this, globalThis.pubsub.subscribers[name].value)
        return globalThis.pubsub.subscribers[name].value
      }
      return value
    }

    function set(value) {
      const set = async () => {
        // await this.rendered
        if (provider) {
          globalThis.pubsub.publish(name, value)
        }
        if (this[`_${String(name)}`] !== value) {
          if (this.willChange) {
            this[`__${String(name)}`] = await this.willChange(name, value)
          }
          if (reflect)
            if (isBoolean)
              if (value || this[`__${String(name)}`]) this.setAttribute(attributeName, '')
              else this.removeAttribute(attributeName)
            else if (value || this[`__${String(name)}`])
              this.setAttribute(attributeName, typeToString(type, this[`__${String(name)}`] ?? value))
            else this.removeAttribute(attributeName)
          // only store data ourselves when really needed
          else this[`_${String(name)}`] = value
          if (this.requestRender && renders) this.requestRender()
          if (this.onChange) this.onChange(name, this[`__${String(name)}`] ?? value)
        }
      }

      if (batches) {
        if (this[`_${String(name)}_timeout`]) clearTimeout(this[`_${String(name)}_timeout`])
        this[`_${String(name)}_timeout`] = setTimeout(set, batchDelay)
      } else set()
    }
  }
}
