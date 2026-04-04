import { SupportedTypes } from './types.js'
import { html, render } from 'lit-html'
import { repeatDirective } from './directives/repeat-directive.js'

type LazyRenderer = () => unknown

class LiteLazyRepeatItem extends HTMLElement {
  private observer?: IntersectionObserver
  private loaded = false
  private _renderer?: LazyRenderer

  set renderer(renderer: LazyRenderer | undefined) {
    const hasChanged = this._renderer !== renderer
    this._renderer = renderer
    if (this.loaded && this._renderer && hasChanged) {
      render(this._renderer(), this)
      return
    }
    if (this.isConnected) this.observeOrLoad()
  }

  connectedCallback() {
    this.observeOrLoad()
  }

  disconnectedCallback() {
    this.observer?.disconnect()
    this.observer = undefined
  }

  private observeOrLoad() {
    if (this.loaded || !this._renderer) return

    if (typeof globalThis.IntersectionObserver === 'undefined') {
      this.load()
      return
    }

    this.observer?.disconnect()
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.load()
          return
        }
      }
    })

    this.observer.observe(this)
  }

  private load() {
    if (this.loaded || !this._renderer) return
    this.loaded = true
    this.observer?.disconnect()
    this.observer = undefined
    render(this._renderer(), this)
  }
}

if (!customElements.get('lite-lazy-repeat-item')) {
  customElements.define('lite-lazy-repeat-item', LiteLazyRepeatItem)
}

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
// For simple cases where items are only added/removed at the end and identity preservation across changes is not needed.
export const arrayRepeat = <T>(
  items: readonly T[] | null | undefined,
  template: (item: T, index: number) => unknown
): unknown => {
  if (!items?.length) return []
  return repeatDirective(
    items,
    (item, index) => index,
    (item, index) => html`<lite-lazy-repeat-item .renderer=${() => template(item, index)}></lite-lazy-repeat-item>`
  )
}

// For cases where items may be added/removed/reordered and a key is needed to preserve identity across changes.
export const arrayRepeatBy = <T>(
  items: readonly T[] | null | undefined,
  keyFn: (item: T, index: number) => unknown,
  template: (item: T, index: number) => unknown
): unknown => {
  if (!items?.length) return []
  return repeatDirective(
    items,
    keyFn,
    (item, index) => html`<lite-lazy-repeat-item .renderer=${() => template(item, index)}></lite-lazy-repeat-item>`
  )
}
