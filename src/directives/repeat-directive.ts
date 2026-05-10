import { repeat as litRepeat } from 'lit-html/directives/repeat.js'

let hasWarnedAboutKeyedNonTemplateRepeat = false

const isLitRepeatCandidate = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false
  return '_$litType$' in value || 'nodeType' in value
}

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  template: (item: T, index: number) => unknown
): unknown

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  keyFn: (item: T, index: number) => unknown,
  template: (item: T, index: number) => unknown
): unknown

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  keyOrTemplate: (item: T, index: number) => unknown,
  templateMaybe?: (item: T, index: number) => unknown
): unknown {
  if (!items?.length) return []

  if (templateMaybe) {
    const firstResult = templateMaybe(items[0], 0)

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
        result[i] = templateMaybe(items[i], i)
      }
      return result
    }

    return litRepeat(items, keyOrTemplate, templateMaybe)
  }

  const template = templateMaybe ?? (keyOrTemplate as (item: T, index: number) => unknown)

  const result = new Array(items.length)
  for (let i = 0; i < items.length; i++) {
    result[i] = template(items[i], i)
  }
  return result
}
