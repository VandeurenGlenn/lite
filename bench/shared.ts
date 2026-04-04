import { JSDOM } from 'jsdom'

let dom: JSDOM | null = null

const ensureBenchDom = () => {
  if (dom) return dom

  dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost'
  })

  const { window } = dom
  const { document } = window

  ;(globalThis as any).window = window
  ;(globalThis as any).document = document
  ;(globalThis as any).Document = window.Document
  ;(globalThis as any).customElements = window.customElements
  ;(globalThis as any).HTMLElement = window.HTMLElement
  ;(globalThis as any).ShadowRoot = window.ShadowRoot
  ;(globalThis as any).CSSStyleSheet = window.CSSStyleSheet
  ;(globalThis as any).Node = window.Node

  try {
    ;(globalThis as any).navigator = window.navigator
  } catch (_) {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      enumerable: true,
      get() {
        return window.navigator
      }
    })
  }

  if (typeof globalThis.performance === 'undefined') {
    ;(globalThis as any).performance = window.performance
  }

  if (!Object.getOwnPropertyDescriptor(window.ShadowRoot.prototype, 'adoptedStyleSheets')) {
    let sheets: any[] = []
    Object.defineProperty(window.ShadowRoot.prototype, 'adoptedStyleSheets', {
      get() {
        return sheets
      },
      set(value) {
        sheets = Array.isArray(value) ? value : []
      }
    })
  }

  return dom
}

ensureBenchDom()

const { LiteElement, html, property, customElement } = await import('../src/index.js')
const { LitElement, html: litHtml } = await import('lit')

export const MANY = 100
export const LITE_TAG = 'lite-bench-element'
export const LIT_TAG = 'lit-bench-element-lit'

@customElement(LITE_TAG)
export class LiteBenchElement extends LiteElement {
  @property({ type: Number, renders: false }) accessor count = 0

  render() {
    return html`<span>${this.count}</span>`
  }
}

export class LitBenchElement extends LitElement {
  static properties = {
    count: { type: Number }
  }

  count = 0

  render() {
    return litHtml`<span>${this.count}</span>`
  }
}

if (!customElements.get(LIT_TAG)) {
  customElements.define(LIT_TAG, LitBenchElement)
}

export const parseOps = (value: string | number) =>
  parseFloat(typeof value === 'string' ? value.replace(/,/g, '') : String(value))

export const createLite = () => document.createElement(LITE_TAG) as LiteBenchElement
export const createLit = () => document.createElement(LIT_TAG) as LitBenchElement
