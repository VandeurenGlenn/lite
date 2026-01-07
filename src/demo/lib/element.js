import { render as litRender, html } from 'https://cdn.jsdelivr.net/npm/lit-html@3.2.1/lit-html.js'
export { html } from 'https://cdn.jsdelivr.net/npm/lit-html@3.2.1/lit-html.js'
export { CSSResult, css } from 'https://cdn.jsdelivr.net/npm/@lit/reactive-element@2.0.4/css-tag.js'

// Minimal copy of LiteElement tailored for the demo
Symbol.metadata ??= Symbol('metadata')

export class LiteElement extends HTMLElement {
  constructor() {
    super()
    this.renderedOnce = false
    this.listeners = []
    this.renderScheduled = false
    this._lite_reflecting = false

    this._microtaskRender = () => {
      litRender(this.render(), this.shadowRoot)
      this.renderScheduled = false
      this.renderResolve(true)
      this.rendered = new Promise((res) => {
        this.renderResolve = res
      })
    }
    this.rendered = new Promise((res) => {
      this.renderResolve = res
    })

    this.attachShadow({ mode: 'open' })

    const ctor = this.constructor
    const styles = ctor.styles
    if (styles && styles.length) {
      let sheets = ctor.__adoptedStyleSheets
      if (!sheets) {
        sheets = styles.map((s) => s.styleSheet ?? s)
        ctor.__adoptedStyleSheets = sheets
      }
      this.shadowRoot.adoptedStyleSheets = sheets
    }
  }

  static get observedAttributes() {
    return this[Symbol.metadata]?.observedAttributes?.values?.() ?? []
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this._lite_reflecting) return
    if (this[name] === newVal && oldVal === newVal) return
    this[name] = newVal
    this.requestRender()
  }

  connectedCallback() {
    if (this.beforeRender) this.beforeRender()
    this.requestRender()
    this.renderedOnce = true
    if (this.firstRender) this.firstRender()
  }

  disconnectedCallback() {
    for (const [type, fn] of this.listeners) this.removeEventListener(type, fn)
  }

  render() {
    return html`<slot></slot>`
  }

  requestRender() {
    if (this.renderScheduled) return
    this.renderScheduled = true
    if (this.renderedOnce) {
      queueMicrotask(this._microtaskRender)
    } else {
      litRender(this.render(), this.shadowRoot)
      this.renderScheduled = false
      this.renderResolve(true)
      queueMicrotask(() => {
        this.rendered = new Promise((res) => {
          this.renderResolve = res
        })
      })
    }
  }

  addListener(type, fn) {
    this.listeners.push([type, fn])
    this.addEventListener(type, fn)
  }
}
