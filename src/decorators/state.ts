export const state = () => {
  return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
    function get() {
      return target[`_${propertyKey}`]
    }

    async function set(value) {
      if (this.onChange) await this.onChange(value)
      if (this.willChange) value = await this.willChange(value)
      target[`_${propertyKey}`] = value
      if (this.requestRender && this.willchange) this.requestRender()
    }
    if (!descriptor) {
      Object.defineProperty(target, propertyKey, {
        get,
        set
      })
    } else {
      descriptor.get = get
      descriptor.set = set
    }
  }
}
