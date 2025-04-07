import LittlePubSub from '@vandeurenglenn/little-pubsub'

globalThis.pubsub = globalThis.pubsub || new LittlePubSub()

declare global {
  var pubsub: LittlePubSub
}

export function darkMode(provides?: boolean | string) {
  return (klass: Function, { addInitializer }) => {
    addInitializer(function () {
      let propertyKey = 'darkMode'
      if (typeof provides === 'string') propertyKey = provides

      const dark = window.matchMedia('(prefers-color-scheme: dark)')

      const changeMode = ({ matches }) => {
        if (matches) this[propertyKey] = true
        else this[propertyKey] = false
        this.requestRender()
        if (provides) pubsub.publish(propertyKey, this.darkMode)
      }

      dark.addEventListener('change', changeMode)
      changeMode(dark)
    })
  }
}
