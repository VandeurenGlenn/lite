# Lite AI Guide

This file is for AI models, code generators, and automated agents working with `@vandeurenglenn/lite`.

It documents the public API, the preferred patterns, and the constraints that matter if you want generated code to be correct, minimal, and efficient.

## What Lite is

Lite is a small custom-element base built on top of `lit-html`, not `LitElement`.

Use it when you want:

- native custom elements
- `lit-html` templates
- a small reactive property system
- very fast first paint with simple follow-up updates
- a few focused decorators instead of a large framework abstraction

Do not assume full `LitElement` behavior. Lite has its own property decorator, lifecycle hooks, and render scheduling.

## Public exports

Primary package entry:

```ts
import {
  LiteElement,
  html,
  css,
  property,
  query,
  queryAll,
  repeat,
  assignedElements,
  customElement,
  darkMode,
  map,
  repeatDirective
} from '@vandeurenglenn/lite'
```

Subpath imports also exist, for example:

```ts
import { LiteElement } from '@vandeurenglenn/lite/element'
import { property } from '@vandeurenglenn/lite/property'
import { map } from '@vandeurenglenn/lite/map'
```

Prefer the main package entry unless there is a specific need for subpaths.

## Preferred component shape

Use this as the default pattern:

```ts
import { LiteElement, html, css, customElement, property } from '@vandeurenglenn/lite'

@customElement('user-card')
class UserCard extends LiteElement {
  @property({ type: String }) accessor name = 'Anonymous'
  @property({ type: Boolean, reflect: true }) accessor selected = false

  static styles = css`
    :host {
      display: block;
    }
  `

  render() {
    return html`<article aria-selected=${String(this.selected)}>${this.name}</article>`
  }
}
```

## Rules AI models should follow

1. Extend `LiteElement`, not `LitElement`.
2. Use `html` and `css` from Lite.
3. Use `@property(...) accessor field = value` for reactive state.
4. Keep render logic inside `render()`.
5. Prefer declarative decorators like `@query` and `@queryAll` over manual DOM lookups in methods.
6. Prefer Lite hooks like `willChange`, `onChange`, `beforeRender`, and `firstRender` over overriding low-level lifecycle methods.
7. If you do override `connectedCallback()` or `disconnectedCallback()`, call `super.connectedCallback()` or `super.disconnectedCallback()`.
8. Do not suggest APIs that belong to `LitElement` but not to Lite, such as `updated`, `willUpdate`, `createRenderRoot`, or `@state`.
9. Do not introduce extra frameworks or helper layers unless explicitly requested.
10. Keep generated components small and direct.

## Reactive properties

Lite reactivity is driven by `@property`.

Example:

```ts
@property({ type: Number }) accessor count = 0
@property({ type: Boolean, reflect: true }) accessor open = false
@property({ type: String, attribute: 'aria-label' }) accessor ariaLabel = ''
@property({ type: Object, attribute: false }) accessor data: Record<string, unknown> = {}
```

Important behavior:

- The decorator is designed for `accessor` fields.
- Camel-case property names map to kebab-case attributes by default.
- `reflect: true` syncs property changes back to attributes.
- `attribute: false` disables attribute observation.
- `type` is used for attribute-to-property coercion.
- `renders: false` is the right choice for internal state that should not schedule a render.
- `provides` and `consumes` connect a property to Lite's global pubsub.
- `provider` and `consumer` exist, but they are deprecated. Prefer `provides` and `consumes`.

Type coercion notes:

- `Boolean`: `''` and `'true'` become `true`; `null` and `'false'` become `false`
- `Number`: string values are converted with `Number(...)`
- `Array` and `Object`: string values are parsed as JSON when possible

Reflection caveat:

- Reflected attributes are written only when the element is connected.

## Render scheduling

Lite is optimized for quick initial paint and cheap follow-up updates.

Actual behavior:

- the first render happens immediately during the first `requestRender()`
- later renders are batched into a microtask queue
- multiple property changes in the same turn collapse into one queued render

That means AI-generated code should:

- batch several property assignments together when possible
- avoid calling `requestRender()` manually unless there is no property-driven update path
- avoid adding extra schedulers, debouncers, or wrapper state systems by default

## Lifecycle and hooks

Prefer these hooks:

```ts
willChange(propertyKey, value) {
  return value
}

onChange(propertyKey, value) {
}

beforeRender() {
}

firstRender() {
}
```

Use them like this:

- `willChange(propertyKey, value)`: mutate or normalize incoming values before they are committed
- `onChange(propertyKey, value)`: react after the value was committed
- `beforeRender()`: run before the initial render
- `firstRender()`: run once after the first connected render path

Also available:

- `beforeChange(propertyKey, value)`: async pre-commit hook if you need it

Practical guidance:

- use `willChange` for normalization and filtering
- use `onChange` for side effects
- use `firstRender` for post-render DOM-dependent work
- prefer these hooks instead of custom `connectedCallback()` logic when possible

## Waiting for rendering

Lite exposes a `rendered` promise.

Use it in tests or imperative integration code:

```ts
const el = document.createElement('user-card')
document.body.appendChild(el)
await el.rendered
```

Prefer `await el.rendered` after property updates when code depends on the rendered DOM being current.

## Styling

Use static adopted stylesheets via `static styles`.

```ts
static styles = css`
  :host {
    display: block;
  }
`
```

Prefer one `static styles` declaration over imperative style injection.

## DOM access decorators

Use these when DOM reads are necessary:

### `@query(selector)`

Returns the first matching element, usually from the shadow root.

```ts
@query('#input') accessor input?: HTMLInputElement
```

### `@queryAll(selector)`

Returns all matching elements.

```ts
@queryAll('.item') accessor items!: HTMLElement[]
```

### `@assignedElements(slotName?)`

Returns assigned slotted elements.

```ts
@assignedElements('actions') accessor actions!: Element[]
```

Guidance:

- use these after render, typically in `firstRender()` or event handlers
- do not add repeated manual `querySelector` calls when a decorator is enough

## Lists and efficient rendering

Lite gives you three distinct list patterns.

### `map(items, template)`

Use for plain array-to-array mapping.

```ts
${map(this.items, (item, index) => html`<li>${index}: ${item}</li>`)}
```

Use `map` when:

- the list is small
- there is no need for lazy rendering
- you just want a simple transform

### `repeat(items, template)`

Use for simple repeated template generation.

```ts
${repeat(this.items, (item) => html`<li>${item}</li>`)}
```

### `repeat(items, keyFn, template)`

This signature is accepted.

```ts
${repeat(this.items, (item) => item.id, (item) => html`<li>${item.label}</li>`)}
```

Behavior notes for AI models:

- when the keyed template returns template-like render values, Lite uses keyed reconciliation for this path
- when the keyed template returns plain non-template values, Lite preserves the older mapped-array behavior for compatibility, but that usage is deprecated
- use this keyed form when DOM identity should survive reorder, insertion, or removal
- prefer `map(...)` for plain value mapping

### `@repeat(source, template, keyFn?)`

Use the decorator form for large or expensive lists.

```ts
@property({ type: Array }) accessor rows = []
@repeat('rows', (row) => html`<li>${row.label}</li>`, (row) => row.id)
accessor visibleRows

render() {
  return html`<ul>${this.visibleRows}</ul>`
}
```

What it does:

- generates lazy list items through an internal placeholder element
- uses `IntersectionObserver` when available
- falls back to immediate load when `IntersectionObserver` is unavailable
- preserves keyed lazy wrapper identity when a `keyFn` is provided

Use the decorator form when:

- the list can get large
- row templates are expensive
- you want incremental, viewport-driven rendering

Use the simple directive form when:

- the list is modest
- eager rendering is fine

## Shared state with `provides` and `consumes`

Lite includes a global pubsub-backed property channel.

Provider:

```ts
@property({ provides: 'drawer-state', type: Boolean }) accessor open = false
```

Consumer:

```ts
@property({ consumes: 'drawer-state', type: Boolean }) accessor open = false
```

Guidance:

- use named channels for anything non-trivial
- keep channel names explicit and stable
- prefer this over ad hoc custom global state plumbing when components only need simple shared values

## Store pattern for grouped state

When managing multiple related pieces of state, a simple store pattern keeps state organized and subscriptions clean:

```ts
import LittlePubSub from '@vandeurenglenn/little-pubsub'

const pubsub = new LittlePubSub()

export const createStore = <T extends Record<string, unknown>>(initialState: T) => {
  let state: T = initialState

  return {
    get(): T {
      return state
    },
    set(updates: Partial<T>): void {
      state = { ...state, ...updates }
      pubsub.emit('store-changed', state)
    },
    subscribe(callback: (state: T) => void): () => void {
      pubsub.on('store-changed', callback)
      return () => pubsub.off('store-changed', callback)
    }
  }
}
```

Usage:

```ts
interface AppState {
  user: { name: string } | null
  theme: 'light' | 'dark'
}

const store = createStore<AppState>({ user: null, theme: 'light' })

// In a component:
@property({ renders: false }) accessor store = store

firstRender() {
  this.store.subscribe(({ user, theme }) => {
    // TypeScript knows user is { name: string } | null
    // TypeScript knows theme is 'light' | 'dark'
    console.log('store changed', user, theme)
  })
}

// Updating state:
store.set({ user: { name: 'Glenn' } })
store.set({ theme: 'dark' })
```

When to use:

- 5+ pieces of related state across multiple components
- clearer intent than scattered `provides` channels
- more organized than raw pubsub emits
- still lightweight—no dependency overhead

For small apps with just 1-2 shared values, `provides` and `consumes` are sufficient.

## `@darkMode`

`@darkMode()` wires an instance property to `prefers-color-scheme: dark`.

```ts
@darkMode()
class ThemeAwareEl extends LiteElement {
  accessor darkMode = false
}
```

You can also publish the value through pubsub:

```ts
@darkMode('dark-mode')
```

Use it when the component should follow system theme automatically.

## `@customElement`

Prefer explicit tag names:

```ts
@customElement('settings-panel')
```

If no name is given, Lite hyphenates the class name.

Prefer explicit names in generated code because they are more stable and easier to review.

## Efficient patterns

Prefer these patterns in generated code:

- use `renders: false` for state that does not affect the template
- keep derived template values inline unless reused in several places
- use `@repeat(...)` for very large lists instead of rendering everything eagerly
- use `await el.rendered` in tests instead of arbitrary timers
- use `static styles = css...` instead of injecting style tags manually
- use `@query` and `@queryAll` for post-render element access
- use `provides` and `consumes` for lightweight shared state between Lite components

## Patterns to avoid

Avoid generating code that assumes Lite is a drop-in replacement for LitElement.

Specifically avoid:

- `@state`, `@internalProperty`, `updated`, `willUpdate`, or `createRenderRoot`
- manual `innerHTML` patching for normal render flows
- adding external state libraries unless the task requires them
- excessive manual `requestRender()` calls after normal property updates
- wrapping every property update in custom debounce logic by default

## Testing guidance

The repository tests use `uvu` and wait on `rendered`.

Useful pattern:

```ts
const el = document.createElement(tag) as MyElement
document.body.appendChild(el)
await el.rendered

el.open = true
await el.rendered
```

Prefer checking:

- reflected attributes after `await el.rendered`
- shadow DOM output after `await el.rendered`
- pubsub-backed propagation after both connected elements have rendered

## Safe default recommendation for AI-generated code

If you need a default approach and there is no special requirement, generate this style of solution:

- one `LiteElement` subclass
- explicit `@customElement('tag-name')`
- a few `@property` accessors with accurate `type`
- `static styles = css...`
- one small `render()` method
- `map(...)` for small lists or `@repeat(...)` for large ones
- `firstRender()` only if DOM access is required after mount

## Summary for models

If you only remember a few things, remember these:

1. Lite is based on `lit-html`, not `LitElement`.
2. Reactive fields should be `@property(...) accessor ...`.
3. The first render is immediate; later renders are batched.
4. `rendered` is the right synchronization point for tests and DOM-dependent code.
5. `map` is for simple mapping, `repeat` is simple repetition, and `@repeat` is the large-list lazy-render tool.
6. `provides` and `consumes` are built-in shared-state channels.
7. Prefer Lite hooks and decorators over manual DOM and lifecycle plumbing.

## Migration Guide

This section helps developers migrate from other frameworks or older versions of Lite to the current version.

### Migrating from LitElement

If you are transitioning from LitElement to Lite, follow these steps:

1. **Extend `LiteElement` instead of `LitElement`:**
   ```ts
   import { LiteElement } from '@vandeurenglenn/lite'

   class MyComponent extends LiteElement {
     // ...existing code...
   }
   ```

2. **Replace `@state` with `@property`:**
   Lite does not use `@state`. Use `@property` with `renders: false` for internal state:
   ```ts
   @property({ renders: false }) accessor internalState = ''
   ```

3. **Use Lite hooks instead of lifecycle methods:**
   Replace `updated`, `willUpdate`, and similar methods with Lite hooks like `willChange`, `onChange`, and `firstRender`.

4. **Avoid `createRenderRoot`:**
   Lite does not support `createRenderRoot`. Shadow DOM is enabled by default.

5. **Use Lite decorators for DOM access:**
   Replace manual `querySelector` calls with `@query` and `@queryAll`.
   ```ts
   @query('#input') accessor input?: HTMLInputElement
   ```

6. **Replace `html` and `css` imports:**
   Use `html` and `css` from Lite instead of Lit.
   ```ts
   import { html, css } from '@vandeurenglenn/lite'
   ```

7. **Update property decorators:**
   Lite uses `accessor` fields with `@property`.
   ```ts
   @property({ type: String }) accessor name = 'Anonymous'
   ```

8. **Remove `@internalProperty`:**
   Use `@property` with `renders: false` for internal state.

### Migrating from Older Lite Versions

1. **Replace deprecated `provider` and `consumer`:**
   Use `provides` and `consumes` instead.
   ```ts
   @property({ provides: 'channel-name' }) accessor value = ''
   @property({ consumes: 'channel-name' }) accessor value = ''
   ```

2. **Update list rendering:**
   Use `@repeat` for large lists and `map` for simple mappings.

3. **Check for removed APIs:**
   Ensure your code does not use removed APIs like `createRenderRoot` or `@state`.

4. **Adopt new hooks:**
   Replace custom lifecycle logic with `willChange`, `onChange`, and `firstRender`.

5. **Use `rendered` promise:**
   Replace arbitrary timers in tests with `await el.rendered`.

### Migration Guide for LLMS

This section provides guidance for language models (LLMs) to adapt their code generation from other frameworks or older versions of Lite to the current version.

### Key Changes for LLMs

1. **Extend `LiteElement` instead of `LitElement`:**
   - Always use `LiteElement` as the base class for components.
   - Avoid suggesting `LitElement`-specific APIs like `updated`, `willUpdate`, or `createRenderRoot`.

2. **Use Lite's `@property` decorator:**
   - Generate `@property` with `accessor` fields for reactive state.
   - Avoid `@state` or `@internalProperty`.
   ```ts
   @property({ type: String }) accessor name = 'Anonymous'
   ```

3. **Prefer Lite hooks over lifecycle methods:**
   - Replace `updated` and `connectedCallback` with Lite hooks like `willChange`, `onChange`, and `firstRender`.
   ```ts
   willChange(propertyKey, value) {
     return value
   }

   onChange(propertyKey, value) {
   }

   firstRender() {
   }
   ```

4. **Use Lite's `html` and `css`:**
   - Always import `html` and `css` from Lite.
   ```ts
   import { html, css } from '@vandeurenglenn/lite'
   ```

5. **Generate efficient list rendering:**
   - Use `map` for small lists and `@repeat` for large or expensive lists.
   ```ts
   ${map(this.items, (item) => html`<li>${item}</li>`)}
   ```
   ```ts
   @repeat('rows', (row) => html`<li>${row.label}</li>`, (row) => row.id)
   accessor visibleRows
   ```

6. **Avoid manual DOM manipulation:**
   - Use `@query` and `@queryAll` for DOM access instead of `querySelector`.
   ```ts
   @query('#input') accessor input?: HTMLInputElement
   ```

7. **Adopt `provides` and `consumes` for shared state:**
   - Replace custom global state plumbing with Lite's pubsub-backed properties.
   ```ts
   @property({ provides: 'channel-name' }) accessor value = ''
   @property({ consumes: 'channel-name' }) accessor value = ''
   ```

8. **Use `static styles` for styling:**
   - Avoid inline styles or manual style injection.
   ```ts
   static styles = css`
     :host {
       display: block;
     }
   `
   ```

9. **Generate tests with `await el.rendered`:**
   - Replace arbitrary timers with `await el.rendered` in test code.
   ```ts
   const el = document.createElement('user-card')
   document.body.appendChild(el)
   await el.rendered
   ```

### General Guidance

- Follow the [Lite AI Guide](#lite-ai-guide) for best practices.
- Avoid introducing external frameworks or libraries unless explicitly requested.
- Keep generated components small, direct, and under 500 lines.
- Prefer declarative patterns and avoid manual DOM manipulation.

By adhering to these guidelines, LLMs can generate code that aligns with Lite's philosophy and ensures compatibility with its current version.
