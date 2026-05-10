// @listen('event', { target: 'window'|'document'|HTMLElement, options })
export interface ListenOptions {
  target?: 'window' | 'document' | EventTarget
  options?: boolean | AddEventListenerOptions
}

export function listen(event: string, opts: ListenOptions = {}) {
  return function (proto: any, methodName: string) {
    const key = Symbol(`__listen_${event}_${methodName}`)
    const origConnected = proto.connectedCallback
    const origDisconnected = proto.disconnectedCallback
    proto.connectedCallback = function (...args: any[]) {
      const target: EventTarget =
        opts.target === 'window' ? window : opts.target === 'document' ? document : opts.target || this
      const handler = this[methodName].bind(this)
      this[key] = handler
      target.addEventListener(event, handler, opts.options)
      if (origConnected) origConnected.apply(this, args)
    }
    proto.disconnectedCallback = function (...args: any[]) {
      const target: EventTarget =
        opts.target === 'window' ? window : opts.target === 'document' ? document : opts.target || this
      if (this[key]) target.removeEventListener(event, this[key], opts.options)
      if (origDisconnected) origDisconnected.apply(this, args)
    }
  }
}
