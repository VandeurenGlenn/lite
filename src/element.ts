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
  private renderResolve: (value: boolean) => void
  private renderedOnce = false
  private rendered = new Promise<boolean>((resolve) => {
    this.renderResolve = resolve
  })
  private attributeChangeTimeout: number | any

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

    this.requestRender()
  }

  connectedCallback() {
    this.renderedOnce = true
    this.renderResolve(true)
    if (this.firstRender) {
      this.firstRender()
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
   * firstRender happens after new value is set and after render
   */
  firstRender?(): void
}
export { html, LiteElement, css }
