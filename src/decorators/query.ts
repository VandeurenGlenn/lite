export const query = (query) => {
  return function (ctor, { kind, name, access, addInitializer }) {
    if (kind !== 'accessor' && kind !== 'field') {
      addInitializer(function () {
        console.warn(`${this.localName}: @query(${query}) ${name} ${kind} is not supported`)
      })

      // return function(initialValue) {
      //   return initialValue
      // }
    }

    if (kind === 'field') {
      return function () {
        return this.shadowRoot ? this.shadowRoot.querySelector(query) : this.querySelector(query)
      }
    } else {
      return {
        get() {
          return this.shadowRoot ? this.shadowRoot.querySelector(query) : this.querySelector(query)
        }
      }
    }
  }
}
