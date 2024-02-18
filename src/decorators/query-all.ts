import { ElementConstructor } from '../element.js'

export const queryAll = (query) => {
  return function (
    ctor,
    { kind, name, access, addInitializer }: ClassAccessorDecoratorContext<ElementConstructor>
  ): ClassAccessorDecoratorResult<ElementConstructor, NodeListOf<ElementConstructor>> {
    if (kind !== 'accessor' && kind !== 'field') {
      addInitializer(function () {
        console.warn(`${this.localName}: @query(${query}) ${String(name)} ${kind} is not supported`)
      })
    }

    return {
      get() {
        return this.shadowRoot ? this.shadowRoot.querySelectorAll(query) : this.querySelectorAll(query)
      }
    }
  }
}
