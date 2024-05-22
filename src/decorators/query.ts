import { ElementConstructor } from '../element.js'

export const query = (query) => {
  return function (
    ctor,
    { kind, name, access, addInitializer }: ClassAccessorDecoratorContext<ElementConstructor>
  ): ClassAccessorDecoratorResult<ElementConstructor, any> {
    if (kind !== 'accessor') {
      addInitializer(function () {
        console.warn(`${this.localName}: @query(${query}) ${String(name)} ${kind} is not supported`)
      })
    }
    return {
      get() {
        const queried = this.shadowRoot ? this.shadowRoot.querySelector(query) : this.querySelector(query)
        if (!queried) return this.querySelector(query)
        return queried
      }
    }
  }
}
