import { LiteElement } from '../element.js'

export type ListenTarget<This extends LiteElement = LiteElement> =
  | 'window'
  | 'document'
  | EventTarget
  | string
  | ((host: This) => EventTarget | null | undefined)

export interface ListenOptions<This extends LiteElement = LiteElement> {
  target?: ListenTarget<This>
  options?: boolean | AddEventListenerOptions
}

export function listen<This extends LiteElement = LiteElement, EventType extends Event = Event>(
  event: string,
  opts: ListenOptions<This> = {}
) {
  return function (
    method: (this: This, event: EventType) => unknown,
    context: ClassMethodDecoratorContext<This, (this: This, event: EventType) => unknown>
  ) {
    if (context.private || context.static) {
      throw new Error('@listen does not support private or static methods')
    }

    context.addInitializer(function () {
      const handler = method.bind(this) as EventListener
      const target = opts.target

      if (typeof target === 'string' && target !== 'window' && target !== 'document') {
        const root = this.shadowRoot
        const options = opts.options
        const once = typeof options === 'object' && options.once
        const listenerOptions = once ? { ...options, once: false } : options

        this.addConnectionEffect(() => {
          const delegated = ((delegatedEvent: Event) => {
            const candidate = delegatedEvent.target as Element
            if (typeof candidate.closest !== 'function' || !candidate.closest(target)) return
            if (once) root.removeEventListener(event, delegated, listenerOptions)
            handler(delegatedEvent)
          }) as EventListener

          root.addEventListener(event, delegated, listenerOptions)
          return () => root.removeEventListener(event, delegated, listenerOptions)
        })
        return
      }

      if (typeof target === 'function') {
        this.addConnectionEffect(() => {
          const resolved = target(this)
          if (!resolved) return
          resolved.addEventListener(event, handler, opts.options)
          return () => resolved.removeEventListener(event, handler, opts.options)
        })
        return
      }

      const resolved = target === 'window' ? window : target === 'document' ? document : target ?? this
      this.addListener(event, handler, opts.options, resolved)
    })
  }
}
