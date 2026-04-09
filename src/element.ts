import { html, render } from 'lit-html'
import { CSSResult, css } from '@lit/reactive-element/css-tag.js'

export { CSSResult }

export declare interface ElementConstructor extends HTMLElement {
  styles?: CSSResult[] | CSSStyleSheet[] | CSSResult | CSSStyleSheet
}

export type StyleList = CSSResult[] | CSSStyleSheet[] | CSSResult | CSSStyleSheet
;(Symbol as any).metadata ??= Symbol('metadata')

class LiteElement extends HTMLElement {
  private static readonly resolvedRenderedPromise = Promise.resolve(true)
  private static renderQueue = new Set<LiteElement>()
  private static flushScheduled = false
  private static flushRenderQueue = () => {
    LiteElement.flushScheduled = false
    const queue = LiteElement.renderQueue
    LiteElement.renderQueue = new Set<LiteElement>()
    for (const el of queue) {
      el.performQueuedRender()
    }
  }

  private renderResolve?: (value: boolean) => void
  private renderedPromise: Promise<boolean> = LiteElement.resolvedRenderedPromise
  private renderedPending = false
  private renderedOnce = false
  private listeners: [string, EventListenerOrEventListenerObject][] = []
  private renderScheduled = false
  private _lite_reflecting = false
  private performQueuedRender() {
    render(this.render(), this.shadowRoot)
    this.renderScheduled = false
    this.resolveRendered()
  }

  get rendered() {
    if (!this.renderedPending && this.renderScheduled) this.ensureRenderedPromise()
    return this.renderedPromise
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.applyStyles()
  }

  private ensureRenderedPromise() {
    if (this.renderedPending) return
    this.renderedPending = true
    this.renderedPromise = new Promise<boolean>((resolve) => {
      this.renderResolve = resolve
    })
  }

  private resolveRendered() {
    if (!this.renderedPending) return
    this.renderResolve?.(true)
    this.renderResolve = undefined
    this.renderedPending = false
    this.renderedPromise = LiteElement.resolvedRenderedPromise
  }

  private applyStyles() {
    const klass = this.constructor as unknown as typeof LiteElement
    const cached = (klass as any).__adoptedStyleSheets as CSSStyleSheet[] | null | undefined
    if (cached === null) return
    if (cached) {
      this.shadowRoot.adoptedStyleSheets = cached
      return
    }

    const styles = klass.styles as (CSSResult | CSSStyleSheet)[] | CSSResult | CSSStyleSheet | undefined
    if (!styles) {
      ;(klass as any).__adoptedStyleSheets = null
      return
    }

    const adopted = (Array.isArray(styles) ? styles : [styles]).map((s: any) => s.styleSheet ?? s)
    ;(klass as any).__adoptedStyleSheets = adopted
    this.shadowRoot.adoptedStyleSheets = adopted
  }

  static get observedAttributes() {
    // @ts-ignore
    const attrs = this[Symbol.metadata]?.observedAttributes
    return attrs ? Array.from(attrs.values()) : []
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (this._lite_reflecting) return
    const observed = (this.constructor as any)[Symbol.metadata]?.observedAttributes as Map<string, string> | undefined
    const propertyKey =
      observed && observed.size
        ? (Array.from(observed.entries()).find(([, attributeName]) => attributeName === name)?.[0] ?? name)
        : name

    // Use Symbol.metadata for type conversion if available
    const meta = (this.constructor as any)[Symbol.metadata]?.properties?.[propertyKey]
    let convertedValue: any = value
    if (meta && meta.type) {
      switch (meta.type) {
        case Boolean:
          convertedValue = value !== null && value !== 'false'
          break
        case Number:
          convertedValue = Number(value)
          break
        case Object:
        case Array:
          try {
            convertedValue = JSON.parse(value)
          } catch {
            convertedValue = value
          }
          break
        default:
          convertedValue = value
      }
    } else {
      const currentValue = (this as any)[propertyKey]
      if (typeof currentValue === 'boolean') {
        convertedValue = value !== null && value !== 'false'
      } else if (typeof currentValue === 'number') {
        convertedValue = value === null ? currentValue : Number(value)
      }
    }
    if ((this as any)[propertyKey] !== convertedValue || old !== value) {
      ;(this as any)[propertyKey] = convertedValue
      this.requestRender()
    }
  }

  connectedCallback() {
    if (this.beforeRender) this.beforeRender()
    this.requestRender()
    this.renderedOnce = true
    if (this.firstRender) this.firstRender()
  }

  disconnectedCallback() {
    for (const [event, listener] of this.listeners) {
      this.removeEventListener(event, listener)
    }
  }

  render() {
    return html`<slot></slot>`
  }

  requestRender() {
    if (!this.renderedOnce) {
      render(this.render(), this.shadowRoot)
      this.resolveRendered()
      return
    }

    if (this.renderScheduled) return
    this.renderScheduled = true
    LiteElement.renderQueue.add(this)
    if (!LiteElement.flushScheduled) {
      LiteElement.flushScheduled = true
      queueMicrotask(LiteElement.flushRenderQueue)
    }
  }

  static styles?: StyleList

  // below ones need to be handled in the decorator to avoid binding issues
  /**
   * beforeChange happens before new value is set but doesn't change the value
   */
  beforeChange?(propertyKey: string, value: any): Promise<any>
  /**
   * willChange happens before new value is set, makes it possible to mutate the value before render
   */
  willChange?(propertyKey: string, value: any): Promise<any>
  /**
   * onChange happens after new value is set and after render
   */
  onChange?(propertyKey: string, value: any): void

  /**
   * beforeRender happens after new value is set or on init and before render
   */
  beforeRender?(): void
  /**
   * firstRender happens after new value is set or on init and after render
   */
  firstRender?(): void

  /**
   * Adds an event listener to the element and stores it in a list to be removed when the element is disconnected
   */
  addListener(event: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.push([event, listener])
    this.addEventListener(event, listener)
  }
}
export { html, LiteElement, css }
