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
    const batchesKey = '_lite_batches'
    const hasBatchTimeout = !!batches && batchDelay > 0

    if (options.provider) console.warn(`${propertyKey}: 'options.provider' is deprecated, use options.provides instead`)
    if (options.consumer) console.warn(`${propertyKey}: 'options.consumer' is deprecated, use options.consumes instead`)

    if (attribute) {
      if (!metadata.observedAttributes) metadata.observedAttributes = new Map()
      // @ts-ignore
      metadata.observedAttributes.set(propertyKey, attributeName)
    }

    addInitializer(function () {
      if (kind !== 'accessor') {
        console.warn(`${this.localName}: @property(${options}) ${propertyKey} ${kind} is not supported`)
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
          if (attribute && this.hasAttribute(attributeName)) {
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
      if (attribute) {
        return isBoolean ? this.hasAttribute(attributeName) : stringToType(this.getAttribute(attributeName), type)
      }
      return this[tempKey] !== undefined ? this[tempKey] : this[liteKey]
    }

    function normalizeValue(value) {
      // Values coming from attributeChangedCallback are string/null; normalize for boolean props.
      if (isBoolean) {
        if (value === '' || value === 'true') return true
        if (value === null || value === 'false') return false
      }
      return value
    }

    function commitValue(value, finalValue) {
      if (attribute) {
        try {
          this._lite_reflecting = true
          if (isBoolean) {
            if (finalValue) {
              if (!this.hasAttribute(attributeName)) this.setAttribute(attributeName, '')
            } else {
              if (this.hasAttribute(attributeName)) this.removeAttribute(attributeName)
            }
          } else if (finalValue) {
            const str = typeToString(type, finalValue)
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
      if (isBoolean) value = normalizeValue(value)

      // Hot path for plain state fields (no reflect/pubsub/render/batching/hooks).
      if (!attribute && !provides && !renders && !hasBatchTimeout && !this.onChange) {
        if (this[liteKey] === value) return
        this[liteKey] = value
        return
      }

      if (provides) pubsub.publish(provides, value)
      if (this[liteKey] === value) return

      commitValue.call(this, value, value)
    }

    async function setAsync(value) {
      value = normalizeValue(value)

      if (provides) pubsub.publish(provides, value)
      if (this[liteKey] === value) return

      if (this.beforeChange) await this.beforeChange(name, value)
      if (this.willChange) this[tempKey] = await this.willChange(name, value)

      const finalValue = this[tempKey] ?? value
      commitValue.call(this, value, finalValue)
    }
  }
}
