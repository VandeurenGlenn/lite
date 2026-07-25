import LittlePubSub from '@vandeurenglenn/little-pubsub'
import { LiteElement } from '../element.js'

globalThis.pubsub = globalThis.pubsub || new LittlePubSub()

declare global {
  var pubsub: LittlePubSub
}

export function darkMode(provides?: boolean | string) {
  return <T extends new (...args: any[]) => LiteElement>(klass: T): T => {
    return class extends klass {
      constructor(...args: any[]) {
        super(...args)
        let propertyKey = 'darkMode'
        if (typeof provides === 'string') propertyKey = provides

        this.addConnectionEffect(() => {
          const dark = window.matchMedia('(prefers-color-scheme: dark)')
          const changeMode = ({ matches }) => {
            this[propertyKey] = matches
            this.requestRender()
            if (provides) pubsub.publish(propertyKey, this[propertyKey])
          }

          dark.addEventListener('change', changeMode)
          changeMode(dark)
          return () => dark.removeEventListener('change', changeMode)
        })
      }
    } as T
  }
}
