export class DarkModeMixin {
  constructor() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)')

    const changeMode = ({ matches }) => {
      if (matches) this.darkMode = true
      else this.darkMode = false
      this.requestRender()
      pubsub.publish('darkMode', this.darkMode)
    }

    dark.addEventListener('change', changeMode)
    changeMode(dark)
  }
}
