export const query = (query: string) => {
  return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
    const get = function () {
      if (this.shadowRoot) {
        return this.shadowRoot.querySelector(query)
      }
      return this.querySelector(query)
    }

    if (!descriptor) {
      Object.defineProperty(target, propertyKey, {
        get
      })
    } else descriptor.get = get
  }
}
