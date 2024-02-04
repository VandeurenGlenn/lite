export const queryAll = (query: string) => {
  return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
    const get = function () {
      if (this.shadowRoot) {
        return Array.from(this.shadowRoot.querySelectorAll(query))
      }
      return Array.from(this.querySelectorAll(query))
    }

    if (!descriptor) {
      Object.defineProperty(target, propertyKey, {
        get
      })
    } else descriptor.get = get
  }
}
