import { Signal } from 'signal-polyfill'

export type SupportedTypes =
  | String
  | Boolean
  | Object
  | Array<any>
  | Number
  | Map<any, any>
  | WeakMap<any, any>
  | Uint8Array

/**
 * @example
 * ```js

@@ -22,19 +21,8 @@ export type SupportedTypes =
 *
 * ```
 */
export type PropertyOptions = {
  type?: SupportedTypes
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
  signal?: boolean | Signal.State<SupportedTypes>
  temporaryRender?: number
}
