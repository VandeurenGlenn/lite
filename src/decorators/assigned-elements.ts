import { ElementConstructor } from '../element.js'

export const assignedElements = (slotName?: string) => {
  const selector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])'
  return function (
    ctor,
    { kind, name, addInitializer }: ClassAccessorDecoratorContext<ElementConstructor>
  ): ClassAccessorDecoratorResult<ElementConstructor, any> {
    if (process.env.NODE_ENV !== 'production' && kind !== 'accessor') {
      addInitializer(function () {
        console.warn(
          `${this.localName}: @assignedElements${slotName ? `(${slotName})` : ''} ${String(name)} ${kind} is not supported`
        )
      })
    }

    return {
      get() {
        const slot = this.shadowRoot?.querySelector(selector) as HTMLSlotElement | null
        return slot?.assignedElements() ?? []
      }
    }
  }
}
