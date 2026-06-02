import { repeat as litRepeat } from 'lit-html/directives/repeat.js'
import { html } from 'lit-html'

let hasWarnedAboutKeyedNonTemplateRepeat = false

export type RepeatOptions = {
  lazy?: boolean
}

const isLitRepeatCandidate = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false
  return '_$litType$' in value || 'nodeType' in value
}

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  template: (item: T, index: number) => unknown,
  options?: RepeatOptions
): unknown

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  keyFn: (item: T, index: number) => unknown,
  template: (item: T, index: number) => unknown,
  options?: RepeatOptions
): unknown

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  keyOrTemplate: (item: T, index: number) => unknown,
  templateMaybe?: ((item: T, index: number) => unknown) | RepeatOptions,
  optionsMaybe?: RepeatOptions
): unknown {
  if (!items?.length) return []

  if (typeof templateMaybe === 'function') {
    const options = optionsMaybe ?? {}
    const template = options.lazy ? createLazyTemplate(templateMaybe) : templateMaybe
    const firstResult = template(items[0], 0)

    if (!isLitRepeatCandidate(firstResult)) {
      if (!hasWarnedAboutKeyedNonTemplateRepeat) {
        hasWarnedAboutKeyedNonTemplateRepeat = true
        console.warn(
          'repeat(items, keyFn, template) with non-template return values is deprecated. Use map(...) for plain value mapping.'
        )
      }

      const result = new Array(items.length)
      result[0] = firstResult
      for (let i = 1; i < items.length; i++) {
        result[i] = template(items[i], i)
      }
      return result
    }

    return litRepeat(items, keyOrTemplate, template)
  }

  const options = templateMaybe ?? {}
  const template = keyOrTemplate as (item: T, index: number) => unknown
  const renderItem = options.lazy ? createLazyTemplate(template) : template

  const result = new Array(items.length)
  for (let i = 0; i < items.length; i++) {
    result[i] = renderItem(items[i], i)
  }
  return result
}

const createLazyTemplate = <T>(template: (item: T, index: number) => unknown) => {
  return (item: T, index: number) =>
    html`<lite-lazy-repeat-item .renderer=${() => template(item, index)}></lite-lazy-repeat-item>`
}
