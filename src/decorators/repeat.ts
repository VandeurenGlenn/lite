import { LiteElement } from '../element.js'
import {
  arrayRepeat as arrayRepeatHelper,
  arrayRepeatBy,
  createKeyedLazyRepeatState,
  KeyedLazyRepeatState
} from '../helpers.js'
import { repeatDirective } from '../directives/repeat-directive.js'

type ListSource<T> = string | ((host: LiteElement) => readonly T[] | T[] | null | undefined)

export function repeat<T>(
  items: readonly T[] | null | undefined,
  template: (item: T, index: number) => unknown
): unknown[]

export function repeat<T>(
  items: readonly T[] | null | undefined,
  keyFn: (item: T, index: number) => unknown,
  template: (item: T, index: number) => unknown
): unknown[]

export function repeat<T>(
  source: ListSource<T>,
  template: (item: T, index: number) => unknown,
  keyFn?: (item: T, index: number) => unknown
): (
  ctor: unknown,
  context: ClassAccessorDecoratorContext<LiteElement>
) => ClassAccessorDecoratorResult<LiteElement, unknown>

export function repeat<T>(
  itemsOrSource: readonly T[] | null | undefined | ListSource<T>,
  keyOrTemplate: (item: T, index: number) => unknown,
  templateMaybe?: (item: T, index: number) => unknown
): unknown {
  // Directive mode: repeat(items, template) or repeat(items, keyFn, template)
  if (Array.isArray(itemsOrSource) || itemsOrSource == null) {
    const items = itemsOrSource as readonly T[] | null | undefined
    if (templateMaybe) return repeatDirective(items, keyOrTemplate, templateMaybe)
    return repeatDirective(items, keyOrTemplate)
  }

  // Decorator mode: @repeat('items', template, keyFn?)
  const source = itemsOrSource as ListSource<T>
  const template = keyOrTemplate
  const keyFn = templateMaybe

  return function (
    ctor: unknown,
    { kind, name, addInitializer }: ClassAccessorDecoratorContext<LiteElement>
  ): ClassAccessorDecoratorResult<LiteElement, unknown> {
    const keyedStateKey = Symbol(`lite-repeat:${String(name)}`)

    if (kind !== 'accessor') {
      addInitializer(function () {
        console.warn(`${this.localName}: @repeat(${String(source)}) ${String(name)} ${kind} is not supported`)
      })
    }

    return {
      get() {
        const items =
          typeof source === 'function'
            ? source(this)
            : ((this as unknown as Record<string, unknown>)[source] as T[] | null)

        if (keyFn) {
          const host = this as unknown as Record<PropertyKey, unknown>
          let keyedState = host[keyedStateKey] as KeyedLazyRepeatState | undefined

          if (!keyedState) {
            keyedState = createKeyedLazyRepeatState()
            host[keyedStateKey] = keyedState
          }

          return arrayRepeatBy(items, keyFn, template, keyedState)
        }

        return arrayRepeatHelper(items, template)
      }
    }
  }
}
