import { html, render } from 'lit-html'
import { CSSResult, css } from '@lit/reactive-element/css-tag.js'

export declare interface ElementConstructor extends HTMLElement {
  styles?: CSSResult[] | CSSStyleSheet[]
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

export type StyleList = CSSResult[] | CSSStyleSheet[]

class LiteElement extends HTMLElement implements ElementConstructor {
  renderResolve
  renderedOnce = false
  rendered = new Promise((resolve) => {
    this.renderResolve = resolve
  })
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    const klass = customElements.get(this.localName) as unknown as ElementConstructor
    this.shadowRoot.adoptedStyleSheets = klass.styles ? klass.styles.map((style) => style.styleSheet ?? style) : []

    this.requestRender()
  }

  static styles: StyleList = []

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
}
export { html, LiteElement, css }
