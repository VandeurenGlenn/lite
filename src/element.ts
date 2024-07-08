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
  renderResolve
  renderedOnce = false
  rendered = new Promise((resolve) => {
    this.renderResolve = resolve
  })

  static get observedAttributes() {
    // @ts-ignore
    return this[Symbol.metadata]?.observedAttributes?.values() ?? []
  }

  attributeChangedCallback(name: string, old: string, value: string) {
    if (this[name] !== value || old !== value) this[name] = value
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    const klass = customElements.get(this.localName) as unknown as typeof LiteElement
    this.shadowRoot.adoptedStyleSheets = klass.styles ? klass.styles.map((style) => style.styleSheet ?? style) : []

    this.requestRender()
  }

  render() {
    return html`<slot></slot>`
  }

  requestRender() {
    render(this.render(), this.shadowRoot)
    if (!this.renderedOnce) {
      this.renderResolve(true)
      this.renderedOnce = true
      // @ts-ignore
      if (this.firstRender) this.firstRender()
    }
  }

  static styles?: StyleList
  /**
   * willChange happens before new value is set, makes it possible to mutate the value before render
   */
  willChange?(propertyKey: string, value: any): Promise<any>
  /**
   * onChange happens after new value is set and after render
   */
  onChange?(propertyKey: string, value: any): void
  /**
   * firstRender happens after new value is set and after render
   */
  firstRender?(): void
}
export { html, LiteElement, css }
