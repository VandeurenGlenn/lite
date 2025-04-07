export function darkMode(name?: string) {
  return (klass: Function, { addInitializer }) => {
    addInitializer(function () {
      const dark = window.matchMedia('(prefers-color-scheme: dark)')

      const changeMode = ({ matches }) => {
        if (matches) this.darkMode = true
        else this.darkMode = false
        this.requestRender()
      }

      dark.addEventListener('change', changeMode)
      changeMode(dark)
    })
  }
}
