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

  async handleRender(target: string) {
    if (target) {
      let value = this[target]
      if (this.willChange) value = await this.willChange(target, this[target])
      if (this.onChange) await this.onChange(target, value)
      if (value !== this[target]) {
        this[target] = value
        return
      }
    }
    render(this.render(), this.shadowRoot)

    if (!this.rendered) {
      this.rendered = true
      this.firstRender()
    }
  }

  /**
   *
   * @param target optional pass the requested propertykey
   * this is needed for array and object additions
   * (tip) no need todo requestRender('myObject')
   * can also do myObject = myObject
   */
  requestRender(target?: string) {
    this.handleRender(target)
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
  willChange(propertyKey, value) {
    return value
  }
}
export { html, LiteElement, css }
