export type SupportedType =
  | StringConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor
  | NumberConstructor
  | MapConstructor
  | WeakMapConstructor
  | Uint8ArrayConstructor

export type SupportedTypes = SupportedType

export type ValueForType<Type extends SupportedType> = Type extends StringConstructor
  ? string
  : Type extends BooleanConstructor
    ? boolean
    : Type extends NumberConstructor
      ? number
      : Type extends Uint8ArrayConstructor
        ? Uint8Array
        : Type extends MapConstructor
          ? Map<unknown, unknown>
          : Type extends WeakMapConstructor
            ? WeakMap<object, unknown>
            : Type extends ArrayConstructor
              ? unknown[]
              : Record<string, unknown>

/**
 * @example
 * ```js

@@ -22,19 +21,8 @@ export type SupportedTypes =
 *
 * ```
 */
export type PropertyOptions = {
  type?: SupportedType
  reflect?: boolean
  attribute?: string | boolean
  renders?: boolean
  value?: string | [] | {} | number | boolean | Map<any, any> | WeakMap<any, any> | Uint8Array
  batches?: boolean
  batchDelay?: number
  provider?: boolean // deprecated
  provides?: boolean | string
  consumer?: boolean // deprecated
  consumes?: boolean | string
  temporaryRender?: number
}
