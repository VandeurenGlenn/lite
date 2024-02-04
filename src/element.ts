import { html, render } from 'lit-html'
import { css, CSSResult } from 'lit'

declare interface ElementConstructor {
  styles?: CSSResult[] | CSSStyleSheet[]
}

export type StyleList = CSSResult[] | CSSStyleSheet[]

class LiteElement extends HTMLElement {
  rendered: boolean
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.requestRender()
    const klass = customElements.get(this.localName) as ElementConstructor
    this.shadowRoot.adoptedStyleSheets = klass.styles ? klass.styles.map((style) => style.styleSheet ?? style) : []
  }

  static styles?: CSSResult[] | CSSStyleSheet[] = []

  render() {
    return html`<slot></slot>`
  }

  requestRender() {
    render(this.render(), this.shadowRoot)

    if (!this.rendered) {
      this.rendered = true
      this.firstRender()
    }
  }

  /**
   * firstRender happens after new value is set and after render
   */
  firstRender() {}

  /**
   * onChange happens after new value is set and after render
   */
  onChange(propertyKey, value) {
    return value
  }

  /**
   * willChange happens before new value is set, makes it possible to mutate the value before render
   */
  willchange(propertyKey, value) {
    return value
  }
}
export { html, LiteElement, css }
