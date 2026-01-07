import LittlePubSub from '@vandeurenglenn/little-pubsub'
import { LiteElement } from '../element.js'
import { PropertyOptions } from '../types.js'
import { stringToType, typeToString } from '../helpers.js'

globalThis.pubsub = globalThis.pubsub || new LittlePubSub()
declare global {
  var pubsub: LittlePubSub
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
  batchDelay: 0
}

export const property = (options?: PropertyOptions) => {
  options = { ...defaultOptions, ...options }
  return function (ctor, { kind, name, addInitializer, access, metadata }: ClassAccessorDecoratorContext<LiteElement>) {
    const { type, reflect, renders, batches, batchDelay, consumer, provider } = options

    const attribute = options.attribute ?? reflect

    const propertyKey = String(name)
    const attributeName = attribute && typeof attribute === 'string' ? attribute : propertyKey
    const isBoolean = type === Boolean
    const consumes = consumer ? attributeName : typeof options.consumes === 'boolean' ? attributeName : options.consumes
    const provides = provider ? attributeName : typeof options.provides === 'boolean' ? attributeName : options.provides

    // Cache property key strings to avoid repeated concatenation
    const liteKey = `_lite_${propertyKey}`
    const tempKey = `__lite_${propertyKey}`
    const timeoutKey = `_${propertyKey}_timeout`

    if (options.provider) console.warn(`${propertyKey}: 'options.provider' is deprecated, use options.provides instead`)
    if (options.consumer) console.warn(`${propertyKey}: 'options.consumer' is deprecated, use options.consumes instead`)

    addInitializer(function () {
      if (kind !== 'accessor') {
        console.warn(`${this.localName}: @property(${options}) ${propertyKey} ${kind} is not supported`)
      }
      if (attribute) {
        if (!metadata) metadata = {}
        if (!metadata.observedAttributes) metadata.observedAttributes = new Map()
        // @ts-ignore
        metadata.observedAttributes.set(propertyKey, attributeName)
      }
      if (consumes) {
        pubsub.subscribe(consumes, async (value) => {
          this[name] = value
        })
      }
      ;(this as any).__lite_hasBeforeChange = typeof (this as any).beforeChange === 'function'
      ;(this as any).__lite_hasWillChange = typeof (this as any).willChange === 'function'
      ;(this as any).__lite_hasOnChange = typeof (this as any).onChange === 'function'
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
          if (value !== undefined && !consumes) set.call(this, value)
          return this[name]
        }
      }
    }

    function get() {
      if (attribute) {
        return isBoolean ? this.hasAttribute(attributeName) : stringToType(this.getAttribute(attributeName), type)
      }
      return this[tempKey] !== undefined ? this[tempKey] : this[liteKey]
    }

    async function set(value) {
      if (provides) pubsub.publish(provides, value)

      if (this[liteKey] === value) return

      if ((this as any).__lite_hasBeforeChange) await this.beforeChange(name, value)
      if ((this as any).__lite_hasWillChange) this[tempKey] = await this.willChange(name, value)

      if (attribute) {
        const actualValue = this[tempKey] ?? value
        try {
          this._lite_reflecting = true
          if (isBoolean) {
            if (actualValue) {
              if (!this.hasAttribute(attributeName)) this.setAttribute(attributeName, '')
            } else {
              if (this.hasAttribute(attributeName)) this.removeAttribute(attributeName)
            }
          } else if (actualValue) {
            const str = typeToString(type, actualValue)
            if (this.getAttribute(attributeName) !== str) this.setAttribute(attributeName, str)
          } else {
            if (this.hasAttribute(attributeName)) this.removeAttribute(attributeName)
          }
        } finally {
          this._lite_reflecting = false
        }
      } else {
        this[liteKey] = value
      }

      // Inline performance critical path
      if (renders && !this[`_lite_batches`]) {
        this[`_lite_batches`] = true
        queueMicrotask(() => {
          this[`_lite_batches`] = false
          if (this.requestRender) this.requestRender()
        })
      }

      if ((this as any).__lite_hasOnChange) this.onChange(name, this[tempKey] ?? value)

      if (batches && batchDelay > 0) {
        if (this[timeoutKey]) clearTimeout(this[timeoutKey])
        this[timeoutKey] = setTimeout(() => {
          if ((this as any).__lite_hasOnChange) this.onChange(name, this[tempKey] ?? value)
        }, batchDelay)
      }
    }
  }
}
