import { JSDOM } from 'jsdom'

let dom: JSDOM | null = null

export const ensureDom = () => {
  if (dom) return dom
  dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost'
  })

  const { window } = dom
  const { document } = window

  // expose globals expected by lit/html and custom elements
  ;(globalThis as any).window = window
  ;(globalThis as any).document = document
  ;(globalThis as any).Document = window.Document
  ;(globalThis as any).customElements = window.customElements
  ;(globalThis as any).HTMLElement = window.HTMLElement
  ;(globalThis as any).ShadowRoot = window.ShadowRoot
  ;(globalThis as any).CSSStyleSheet = window.CSSStyleSheet
  ;(globalThis as any).Event = window.Event
  ;(globalThis as any).EventTarget = window.EventTarget
  ;(globalThis as any).Node = window.Node
  try {
    ;(globalThis as any).navigator = window.navigator
  } catch (_) {
    // fallback for environments that expose a read-only navigator
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      enumerable: true,
      get() {
        return window.navigator
      }
    })
  }

  // Use native Node.js performance for better benchmarking
  if (typeof globalThis.performance === 'undefined') {
    ;(globalThis as any).performance = window.performance
  }

  // jsdom does not implement adoptedStyleSheets; provide a no-op shim
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

// Initialize immediately for test environments that rely on globals eagerly
ensureDom()

// Surface errors that can cause UVU to exit early without details
process.on('uncaughtException', (err: any) => {
  console.error('uncaughtException', err?.stack || err)
})
process.on('unhandledRejection', (reason: any) => {
  console.error('unhandledRejection', (reason && (reason as any).stack) || reason)
})
