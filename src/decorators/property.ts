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

const toAttributeName = (propertyKey: string) => propertyKey.replace(/([A-Z])/g, '-$1').toLowerCase()

export const property = (options?: PropertyOptions) => {
  options = { ...defaultOptions, ...options }
  return function (ctor, { kind, name, addInitializer, access, metadata }: ClassAccessorDecoratorContext<LiteElement>) {
    // DEV-ONLY DIAGNOSTICS (tree-shakeable)
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // 1. Warn if not used on accessor
      if (kind !== 'accessor') {
        // eslint-disable-next-line no-console
        console.warn(`@property should be used on accessor fields only: ${String(name)} (${kind})`)
      }
      // 2. Warn if reflect:true and attribute:false
      if (options.reflect && options.attribute === false) {
        // eslint-disable-next-line no-console
        console.warn(`@property: reflect:true has no effect when attribute:false (${String(name)})`)
      }
    }
    const { type, reflect, renders, batches, batchDelay, consumer, provider } = options

    const observesAttribute = options.attribute !== false

    const propertyKey = String(name)
    const attributeName =
      observesAttribute && typeof options.attribute === 'string' ? options.attribute : toAttributeName(propertyKey)
    const shouldReflect = !!reflect && observesAttribute
    const isBoolean = type === Boolean
    const consumes = consumer ? attributeName : typeof options.consumes === 'boolean' ? attributeName : options.consumes
    const provides = provider ? attributeName : typeof options.provides === 'boolean' ? attributeName : options.provides

    // Cache property key strings to avoid repeated concatenation
    const liteKey = `_lite_${propertyKey}`
    const tempKey = `__lite_${propertyKey}`
    const timeoutKey = `_${propertyKey}_timeout`
    const batchesKey = '_lite_batches'
    const hasBatchTimeout = !!batches && batchDelay > 0

    if (options.provider) console.warn(`${propertyKey}: 'options.provider' is deprecated, use options.provides instead`)
    if (options.consumer) console.warn(`${propertyKey}: 'options.consumer' is deprecated, use options.consumes instead`)

    if (observesAttribute) {
      if (!metadata.observedAttributes) metadata.observedAttributes = new Map()
      // @ts-ignore
      metadata.observedAttributes.set(propertyKey, attributeName)
    }
    // 3. Warn on invalid JSON for Object/Array coercion (dev only, only on attribute init)
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      if ((options.type === Object || options.type === Array) && observesAttribute) {
        addInitializer(function () {
          if (this.hasAttribute && this.hasAttribute(attributeName)) {
            const val = this.getAttribute(attributeName)
            try {
              if (val != null) JSON.parse(val)
            } catch {
              // eslint-disable-next-line no-console
              console.warn(`@property: attribute '${attributeName}' for ${String(name)} is not valid JSON:`, val)
            }
          }
        })
      }
    }

    addInitializer(function () {
      if (kind !== 'accessor') {
        console.warn(`${this.localName}: @property(${options}) ${propertyKey} ${kind} is not supported`)
      }
      // Always initialize property from attribute if present
      if (observesAttribute && this.hasAttribute(attributeName)) {
        const attrValue = isBoolean
          ? this.hasAttribute(attributeName)
          : stringToType(this.getAttribute(attributeName), type)
        // Only set if not already set by user/constructor
        if (this[name] === undefined) {
          this[name] = attrValue
        }
      }
      if (consumes) {
        pubsub.subscribe(consumes, async (value) => {
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
          if (this.beforeChange || this.willChange) return setAsync.call(this, value)
          return setSync.call(this, value)
        },
        init(value: any): any {
          if (observesAttribute && this.hasAttribute(attributeName)) {
            value = isBoolean ? this.hasAttribute(attributeName) : stringToType(this.getAttribute(attributeName), type)
          }
          if (value !== undefined && !consumes) {
            if (this.beforeChange || this.willChange) setAsync.call(this, value)
            else setSync.call(this, value)
          }
          return this[name]
        }
      }
    }

    function get() {
      return this[tempKey] !== undefined ? this[tempKey] : this[liteKey]
    }

    function coerceValue(value, currentValue) {
      // Only coerce string/null values (from attributes); JS assignments already carry the right type
      if (typeof value !== 'string' && value !== null) return value

      if (type === Boolean) {
        if (value === '' || value === 'true') return true
        if (value === null || value === 'false') return false
        return value
      }
      if (type === Number) return value === null ? currentValue : Number(value)
      if (type === Object || type === Array) {
        if (value === null) return null
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      if (!type) {
        if (typeof currentValue === 'boolean') {
          if (value === '' || value === 'true') return true
          if (value === null || value === 'false') return false
        }
        if (typeof currentValue === 'number') return value === null ? currentValue : Number(value)
      }
      return value
    }

    function commitValue(value, finalValue) {
      this[liteKey] = finalValue

      if (shouldReflect && this.isConnected) {
        try {
          this._lite_reflecting = true
          if (isBoolean) {
            if (finalValue) {
              if (!this.hasAttribute(attributeName)) this.setAttribute(attributeName, '')
            } else {
              if (this.hasAttribute(attributeName)) this.removeAttribute(attributeName)
            }
          } else if (finalValue !== undefined && finalValue !== null) {
            const str = typeToString(type, finalValue)
            if (this.getAttribute(attributeName) !== str) this.setAttribute(attributeName, str)
          } else {
            if (this.hasAttribute(attributeName)) this.removeAttribute(attributeName)
          }
        } finally {
          this._lite_reflecting = false
        }
      }

      if (renders) {
        // Before first render, batch property initialization work into one microtask.
        // After mount, rely on LiteElement.requestRender() to dedupe scheduling.
        if (this.renderedOnce) {
          if (this.requestRender) this.requestRender()
        } else if (!this[batchesKey]) {
          this[batchesKey] = true
          queueMicrotask(() => {
            this[batchesKey] = false
            if (!this.renderedOnce && this.requestRender) this.requestRender()
          })
        }
      }

      if (this.onChange) this.onChange(name, finalValue)

      if (hasBatchTimeout) {
        if (this[timeoutKey]) clearTimeout(this[timeoutKey])
        this[timeoutKey] = setTimeout(() => {
          if (this.onChange) this.onChange(name, finalValue)
        }, batchDelay)
      }
    }

    function setSync(value) {
      const currentValue = this[liteKey]
      const coerced = coerceValue(value, currentValue)

      // Hot path for plain state fields (no reflect/pubsub/render/batching/hooks).
      if (!observesAttribute && !provides && !renders && !hasBatchTimeout && !this.onChange) {
        if (currentValue === coerced) return
        this[liteKey] = coerced
        return
      }

      if (provides) pubsub.publish(provides, coerced)
      if (currentValue === coerced) return

      commitValue.call(this, coerced, coerced)
    }

    async function setAsync(value) {
      const currentValue = this[liteKey]
      const coerced = coerceValue(value, currentValue)

      if (provides) pubsub.publish(provides, coerced)
      if (currentValue === coerced) return

      if (this.beforeChange) await this.beforeChange(name, coerced)
      if (this.willChange) this[tempKey] = await this.willChange(name, coerced)

      const finalValue = this[tempKey] ?? coerced
      commitValue.call(this, coerced, finalValue)
    }
  }
}
