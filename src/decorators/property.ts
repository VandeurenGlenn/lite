import LittlePubSub from '@vandeurenglenn/little-pubsub'
import { LiteElement } from '../element.js'
import { PropertyOptions } from '../types.js'
import { stringToType, typeToString } from '../helpers.js'

globalThis.pubsub = globalThis.pubsub || new LittlePubSub()

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

export const property = (options?: PropertyOptions) => {
  options = { ...defaultOptions, ...options }
  let totalBatchUpdates = 0
  return function (ctor, { kind, name, addInitializer, access, metadata }: ClassAccessorDecoratorContext<LiteElement>) {
    const { type, reflect, renders, batches, batchDelay, consumer, provider, temporaryRender } = options

    const attribute = options.attribute ?? reflect

    const propertyKey = String(name)
    const attributeName = attribute && typeof attribute === 'string' ? attribute : propertyKey
    const isBoolean = type === Boolean
    const consumes = consumer ? attributeName : typeof options.consumes === 'boolean' ? attributeName : options.consumes
    const provides = provider ? attributeName : typeof options.provides === 'boolean' ? attributeName : options.provides

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
        globalThis.pubsub.subscribe(consumes, async (value) => {
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
          if (value !== undefined && !consumes) set.call(this, value)
          return this[name]
        }
      }
    }

    // let timeoutChange
    function get() {
      const value = attribute
        ? isBoolean
          ? this.hasAttribute(attributeName)
          : stringToType(this.getAttribute(attributeName), type)
        : this[`__lite_${propertyKey}`]
        ? this[`__lite_${propertyKey}`]
        : this[`_lite_${propertyKey}`]
      // if (consumes && !this[`__lite_${propertyKey}`] && globalThis.pubsub.subscribers?.[consumes]?.value) {
      //   if (value !== globalThis.pubsub.subscribers[consumes].value)
      //     set.call(this, globalThis.pubsub.subscribers[consumes].value)
      //   return globalThis.pubsub.subscribers[consumes].value
      // }
      return value
    }

    async function set(value) {
      // await this.rendered
      if (provides) {
        globalThis.pubsub.publish(provides, value)
      }
      if (this[`_lite_${propertyKey}`] !== value) {
        if (this.willChange) {
          this[`__lite_${propertyKey}`] = await this.willChange(name, value)
        }
        if (attribute)
          if (isBoolean)
            if (value || this[`__lite_${propertyKey}`]) this.setAttribute(attributeName, '')
            else this.removeAttribute(attributeName)
          else if (value || this[`__lite_${propertyKey}`])
            this.setAttribute(attributeName, typeToString(type, this[`__lite_${propertyKey}`] ?? value))
          else this.removeAttribute(attributeName)
        // only store data ourselves when really needed
        else this[`_lite_${propertyKey}`] = value

        const performUpdate = () => {
          totalBatchUpdates = 0
          if (this.requestRender && renders) this.requestRender()
          if (this.onChange) this.onChange(name, this[`__lite_${propertyKey}`] ?? value)
        }

        if (batches) {
          if (totalBatchUpdates === temporaryRender) {
            performUpdate()
          } else {
            if (this[`_${propertyKey}_timeout`]) clearTimeout(this[`_${propertyKey}_timeout`])
            this[`_${propertyKey}_timeout`] = setTimeout(performUpdate, batchDelay)
          }
        } else {
          performUpdate()
        }
      }
    }
  }
}
