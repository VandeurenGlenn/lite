import { ElementConstructor } from '../element.js'

export const queryAll = (query) => {
  return function (
    ctor,
    { kind, name, addInitializer }: ClassAccessorDecoratorContext<ElementConstructor>
  ): ClassAccessorDecoratorResult<ElementConstructor, Node[]> {
    if (process.env.NODE_ENV !== 'production' && kind !== 'accessor') {
      addInitializer(function () {
        console.warn(`${this.localName}: @query(${query}) ${String(name)} ${kind} is not supported`)
      })
    }

    return {
      get() {
        const queried = this.shadowRoot ? this.shadowRoot.querySelectorAll(query) : this.querySelectorAll(query)
        return Array.from(queried)
      }
    }
  }
}
