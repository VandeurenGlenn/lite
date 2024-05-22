import { ElementConstructor } from '../element.js'

export const queryAll = (query) => {
  return function (
    ctor,
    { kind, name, access, addInitializer }: ClassAccessorDecoratorContext<ElementConstructor>
  ): ClassAccessorDecoratorResult<ElementConstructor, Node[]> {
    if (kind !== 'accessor') {
      addInitializer(function () {
        console.warn(`${this.localName}: @query(${query}) ${String(name)} ${kind} is not supported`)
      })
    }

    return {
      get() {
        let queried = this.shadowRoot ? this.shadowRoot.querySelectorAll(query) : this.querySelectorAll(query)
        if (!queried) queried = this.querySelectorAll(query)
        return Array.from(queried)
      }
    }
  }
}
