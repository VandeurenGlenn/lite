import { ElementConstructor } from '../element.js'

export const assignedElements = (slotName?: string) => {
  return function (
    ctor,
    { kind, name, access, addInitializer }: ClassAccessorDecoratorContext<ElementConstructor>
  ): ClassAccessorDecoratorResult<ElementConstructor, any> {
    if (kind !== 'accessor') {
      addInitializer(function () {
        console.warn(
          `${this.localName}: @assignedElements${!slotName ?? `(${slotName})`} ${String(name)} ${kind} is not supported`
        )
      })
    }
    let queryIt: () => HTMLSlotElement
    if (slotName) {
      queryIt = () => document.querySelector(`slot[name="${slotName}"]`) as HTMLSlotElement
    } else {
      queryIt = () => document.querySelector('slot:not([name])')
    }

    return {
      get() {
        return queryIt().assignedElements()
      }
    }
  }
}
