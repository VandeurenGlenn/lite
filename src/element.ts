import { html, render } from 'lit-html'
import { CSSResult, css } from '@lit/reactive-element/css-tag.js'

export { CSSResult }

export declare interface ElementConstructor extends HTMLElement {
  styles?: CSSResult[] | CSSStyleSheet[]
}

export type StyleList = CSSResult[] | CSSStyleSheet[]

export interface SymbolMetadataConstructor extends SymbolConstructor {
  metadata: Symbol
}
// @ts-ignore
Symbol.metadata ??= Symbol('metadata')

class LiteElement extends HTMLElement {
  private attributeChangeTimeout: number | any
  private renderResolve: (value: boolean) => void
  private renderedOnce = false
  private listeners: [string, EventListenerOrEventListenerObject][] = []

  rendered = new Promise<boolean>((resolve) => {
    this.renderResolve = resolve
  })

  static get observedAttributes() {
    // @ts-ignore
    return this[Symbol.metadata]?.observedAttributes?.values() ?? []
  }

  attributeChangedCallback(name: string, old: string, value: string) {
    if (this[name] !== value || old !== value) {
      this[name] = value
      if (this.attributeChangeTimeout) {
        clearTimeout(this.attributeChangeTimeout)
      }
      this.attributeChangeTimeout = setTimeout(
        () => {
          this.requestRender()
        },
        // make sure to render asap if it's the first render
        this.renderedOnce ? 150 : 0
      )
    }
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    const klass = customElements.get(this.localName) as unknown as typeof LiteElement
    this.shadowRoot.adoptedStyleSheets = klass.styles ? klass.styles.map((style) => style.styleSheet ?? style) : []
    this.beforeRender?.()
    this.requestRender()
  }

  connectedCallback() {
    this.renderedOnce = true
    this.renderResolve(true)
    this.firstRender?.()
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
    render(this.render(), this.shadowRoot)
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
