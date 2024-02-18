import { ElementConstructor } from '../element.js'

export const query = (query) => {
  return function (
    ctor,
    { kind, name, access, addInitializer }: ClassAccessorDecoratorContext<ElementConstructor>
  ): ClassAccessorDecoratorResult<ElementConstructor, ElementConstructor> {
    if (kind !== 'accessor' && kind !== 'field') {
      addInitializer(function () {
        console.warn(`${this.localName}: @query(${query}) ${String(name)} ${kind} is not supported`)
      })
    }
    return {
      get() {
        return this.shadowRoot ? this.shadowRoot.querySelector(query) : this.querySelector(query)
      }
    }
  }
}
