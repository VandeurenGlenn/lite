import LittlePubSub from '@vandeurenglenn/little-pubsub'
import { ElementConstructor, LiteElement } from '../element.js'

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
  attribute?: string | boolean
  renders?: boolean
  value?: string | [] | {} | number | boolean | Map<any, any> | WeakMap<any, any> | Uint8Array
  batches?: boolean
  batchDelay?: number
  provider?: boolean
  consumer?: boolean
  temporaryRender?: number
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
  batchDelay: 50,
  temporaryRender: 10
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
  let totalBatchUpdates = 0
  return function (ctor, { kind, name, addInitializer, access, metadata }: ClassAccessorDecoratorContext<LiteElement>) {
    const { type, reflect, attribute, renders, batches, batchDelay, consumer, provider, temporaryRender } = options
    const propertyKey = String(name)
    const attributeName = attribute && typeof attribute === 'string' ? attribute : propertyKey
    const isBoolean = type === Boolean
    addInitializer(async function () {
      if (kind !== 'accessor') {
        console.warn(`${this.localName}: @property(${options}) ${propertyKey} ${kind} is not supported`)
      }
      if (attribute) {
        if (!metadata) metadata = {}
        if (!metadata.observedAttributes) metadata.observedAttributes = new Map()
        // @ts-ignore
        metadata.observedAttributes.set(propertyKey, attributeName)
      }
      if (consumer) {
        globalThis.pubsub.subscribe(name, async (value) => {
          this[name] = value
        })
      }
    })
    if (kind === 'accessor') {
      return {
        get(): any {
          return get.call(this)
        },
        set(value: any) {
          return set.call(this, value)
        },
        init(value: any): any {
          if (this.hasAttribute(attributeName)) {
            value = isBoolean ? this.hasAttribute(attributeName) : stringToType(this.getAttribute(attributeName), type)
          }
          if (value !== undefined) set.call(this, value)
          if (consumer && globalThis.pubsub.subscribers?.[name]?.value)
            set.call(this, globalThis.pubsub.subscribers[name].value)

          return this[name]
        }
      }
    }

    // let timeoutChange
    function get() {
      const value = reflect
        ? isBoolean
          ? this.hasAttribute(attributeName)
          : stringToType(this.getAttribute(attributeName), type)
        : this[`__${propertyKey}`]
        ? this[`__${propertyKey}`]
        : this[`_${propertyKey}`]
      if (consumer && !this[`__${propertyKey}`] && globalThis.pubsub.subscribers?.[propertyKey]?.value) {
        if (value !== globalThis.pubsub.subscribers[name].value)
          set.call(this, globalThis.pubsub.subscribers[name].value)
        return globalThis.pubsub.subscribers[name].value
      }
      return value
    }

    async function set(value) {
      // await this.rendered
      if (provider) {
        globalThis.pubsub.publish(name, value)
      }
      if (this[`_${propertyKey}`] !== value) {
        if (this.willChange) {
          this[`__${propertyKey}`] = await this.willChange(name, value)
        }
        if (reflect)
          if (isBoolean)
            if (value || this[`__${propertyKey}`]) this.setAttribute(attributeName, '')
            else this.removeAttribute(attributeName)
          else if (value || this[`__${propertyKey}`])
            this.setAttribute(attributeName, typeToString(type, this[`__${propertyKey}`] ?? value))
          else this.removeAttribute(attributeName)
        // only store data ourselves when really needed
        else this[`_${propertyKey}`] = value

        const performUpdate = () => {
          totalBatchUpdates = 0
          if (this.requestRender && renders) this.requestRender()
          if (this.onChange) this.onChange(name, this[`__${propertyKey}`] ?? value)
        }

        if (batches) {
          if (totalBatchUpdates === temporaryRender) {
            performUpdate()
          }
          if (this[`_${propertyKey}_timeout`]) clearTimeout(this[`_${propertyKey}_timeout`])
          this[`_${propertyKey}_timeout`] = setTimeout(performUpdate, batchDelay)
        } else {
          performUpdate()
        }
      }
    }
  }
}
