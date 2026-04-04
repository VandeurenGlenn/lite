export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  template: (item: T, index: number) => unknown
): unknown[]

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  keyFn: (item: T, index: number) => unknown,
  template: (item: T, index: number) => unknown
): unknown[]

export function repeatDirective<T>(
  items: readonly T[] | null | undefined,
  keyOrTemplate: (item: T, index: number) => unknown,
  templateMaybe?: (item: T, index: number) => unknown
): unknown[] {
  if (!items?.length) return []

  const template = templateMaybe ?? (keyOrTemplate as (item: T, index: number) => unknown)

  const result = new Array(items.length)
  for (let i = 0; i < items.length; i++) {
    result[i] = template(items[i], i)
  }
  return result
}
