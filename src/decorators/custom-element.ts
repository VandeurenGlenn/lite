const hyphenate = (string) => string.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()

export function customElement() {
  return (klass: Function, { addInitializer }) => {
    addInitializer(function () {
      customElements.define(hyphenate(klass.name), this)
    })
  }
}
