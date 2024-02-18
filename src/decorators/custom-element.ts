const hyphenate = (string) => string.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()

export function customElement(name?: string) {
  return (klass: Function, { addInitializer }) => {
    addInitializer(function () {
      customElements.define(name ?? hyphenate(klass.name), this)
    })
  }
}
