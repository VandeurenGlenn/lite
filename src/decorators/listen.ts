import { LiteElement } from '../element.js'

export interface ListenOptions {
  target?: 'window' | 'document' | EventTarget
  options?: boolean | AddEventListenerOptions
}

export function listen(event: string, opts: ListenOptions = {}) {
  return function <This extends LiteElement, EventType extends Event>(
    method: (this: This, event: EventType) => unknown,
    context: ClassMethodDecoratorContext<This, (this: This, event: EventType) => unknown>
  ) {
    if (context.private || context.static) {
      throw new Error('@listen does not support private or static methods')
    }

    context.addInitializer(function () {
      const handler = method.bind(this) as EventListener

      this.addConnectionEffect(() => {
        const target: EventTarget =
          opts.target === 'window' ? window : opts.target === 'document' ? document : opts.target ?? this

        target.addEventListener(event, handler, opts.options)
        return () => target.removeEventListener(event, handler, opts.options)
      })
    })
  }
}
