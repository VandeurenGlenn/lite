import { html, render } from 'lit-html'
import { CSSResult, css } from '@lit/reactive-element/css-tag.js'

export { CSSResult }

export declare interface ElementConstructor extends HTMLElement {
  styles?: CSSResult[] | CSSStyleSheet[] | CSSResult | CSSStyleSheet
}

export type StyleList = CSSResult[] | CSSStyleSheet[] | CSSResult | CSSStyleSheet

;(Symbol as any).metadata ??= Symbol('metadata')

class LiteElement extends HTMLElement {
  private renderResolve: (value: boolean) => void
  private renderedOnce = false
  private listeners: [string, EventListenerOrEventListenerObject][] = []
  private renderScheduled = false
  private _lite_reflecting = false
  private _microtaskRender = () => {
    render(this.render(), this.shadowRoot)
    this.renderScheduled = false
    this.renderResolve(true)
    this.rendered = new Promise((resolve) => {
      this.renderResolve = resolve
    })
  }

  rendered = new Promise<boolean>((resolve) => {
    this.renderResolve = resolve
  })

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    const klass = this.constructor as unknown as typeof LiteElement
    const styles = klass.styles as (CSSResult | CSSStyleSheet)[] | CSSResult | CSSStyleSheet | undefined
    if (styles) {
      let adopted = (klass as any).__adoptedStyleSheets as CSSStyleSheet[] | undefined
      if (!adopted) {
        adopted = (Array.isArray(styles) ? styles : [styles]).map((s: any) => s.styleSheet ?? s)
        ;(klass as any).__adoptedStyleSheets = adopted
      }
      this.shadowRoot.adoptedStyleSheets = adopted
    }
  }

  static get observedAttributes() {
    // @ts-ignore
    return this[Symbol.metadata]?.observedAttributes?.values() ?? []
  }

  attributeChangedCallback(name: string, old: string, value: string) {
    if (this._lite_reflecting) return
    if (this[name] !== value || old !== value) {
      this[name] = value
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
      this.renderResolve(true)
      queueMicrotask(() => {
        this.rendered = new Promise((resolve) => {
          this.renderResolve = resolve
        })
      })
      return
    }

    if (this.renderScheduled) return
    this.renderScheduled = true
    queueMicrotask(this._microtaskRender)
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
