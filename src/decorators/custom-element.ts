const hyphenate = (string) => string.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()

export function customElement(name?: string) {
  return (klass: Function, { addInitializer }) => {
    addInitializer(function () {
      const tag = name ?? hyphenate(klass.name)
      if (customElements.get(tag)) {
        console.warn(`possibly importing double code or ${name} aleady taken`);
        return
      }
      customElements.define(tag, this)
      
      
    })
  }
}
