import LittlePubSub from '@vandeurenglenn/little-pubsub'

globalThis.pubsub = globalThis.pubsub || new LittlePubSub()

declare global {
  var pubsub: LittlePubSub
}

export function darkMode(provides?: boolean) {
  return (klass: Function, { addInitializer }) => {
    addInitializer(function () {
      const dark = window.matchMedia('(prefers-color-scheme: dark)')

      const changeMode = ({ matches }) => {
        if (matches) this.darkMode = true
        else this.darkMode = false
        this.requestRender()
        if (provides) pubsub.publish('darkMode', this.darkMode)
      }

      dark.addEventListener('change', changeMode)
      changeMode(dark)
    })
  }
}
