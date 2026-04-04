# lite

## install

```sh
npm i @vandeurenglenn/lite
```

## why lite

Lite is useful when you want a tiny custom-element base with modern decorators, but without heavy framework overhead.

We are big fans of Lit. Lite exists for a specific rendering philosophy: show UI as soon as possible.
Instead of waiting for every property/data path to be fully ready, Lite is optimized for an "asap" first paint and then progressive updates as state arrives.

- Small mental model: reactive properties + a few focused decorators.
- Fast list rendering options: simple `map`, keyed `repeat`, and lazy viewport rendering via `@repeat`.
- Built-in component communication: `provides` / `consumes` channels for shared state.
- Works with native web components: easy to embed in existing apps without full framework lock-in.
- Lifecycle hooks where they matter: `willChange`, `onChange`, `firstRender`.

Use Lite when you want to ship custom elements quickly, keep dependencies light, and still have ergonomic patterns for real-world UI state and rendering.

## usage

```js
import { LiteElement, property, repeat, html, customElement } from '@vandeurenglenn/lite'

@customElement('some-element')
class SomeElement extends LiteElement {
  @property({ type: Array })
  accessor items = ['hello', 'world']

  render() {
    return html`
      <ul>
        ${repeat(this.items, (item) => html`<li>${item}</li>`)}
      </ul>
    `
  }
}
```

### one big example (all core features)

```js
import {
  LiteElement,
  html,
  css,
  customElement,
  darkMode,
  property,
  repeat,
  map,
  query,
  queryAll,
  assignedElements
} from '@vandeurenglenn/lite'

// Register a custom element and attach dark mode state to this instance.
@customElement('kitchen-sink-el')
@darkMode(true)
class KitchenSinkEl extends LiteElement {
  // Standard reactive property that also reflects as an attribute.
  @property({ type: Boolean, reflect: true })
  accessor open = false

  // Provide data to other components through pubsub.
  @property({ type: Array, provides: 'items-channel' })
  accessor items = ['alpha', 'beta', 'gamma']

  // Consume shared state provided by another component.
  @property({ type: Boolean, consumes: 'drawer-state' })
  accessor drawerOpen = false

  // Big list source used by lazy viewport rendering.
  @property({ type: Array })
  accessor largeItems = Array.from({ length: 200 }, (_, i) => ({ id: i, label: `row-${i}` }))

  // Decorator mode: lazy render rows when they enter the viewport.
  @repeat('largeItems', (item) => html`<li>${item.label}</li>`, (item) => item.id)
  accessor visibleRows

  // Query a single node from shadow root after render.
  @query('#title') accessor titleEl

  // Query all matching nodes from shadow root after render.
  @queryAll('.chip') accessor chips

  // Read assigned slot elements.
  @assignedElements('actions') accessor actionButtons

  static styles = css`
    :host {
      display: block;
      padding: 12px;
    }
  `

  // Optional hook: mutate incoming values before they are stored.
  willChange(propertyKey, value) {
    if (propertyKey === 'items' && Array.isArray(value)) return value.filter(Boolean)
    return value
  }

  // Optional hook: react after values changed and render was requested.
  onChange(propertyKey, value) {
    if (propertyKey === 'open') console.log('open changed:', value)
  }

  // Optional hook: run once after first paint.
  firstRender() {
    console.log('first render complete', this.titleEl)
  }

  render() {
    return html`
      <h2 id="title">Kitchen Sink</h2>

      <button @click=${() => (this.open = !this.open)}>toggle open</button>

      <h3>repeat directive</h3>
      <ul>
        ${repeat(this.items, (item, i) => html`<li class="chip">${i}: ${item}</li>`)}
      </ul>

      <h3>map directive</h3>
      <div>
        ${map(this.items, (item) => html`<span style="margin-right:8px">${item}</span>`) }
      </div>

      <h3>repeat decorator (lazy viewport rows)</h3>
      <ul>${this.visibleRows}</ul>

      <slot name="actions"></slot>
    `
  }
}
```

### repeat directive

Use repeat in templates for lists.

```js
repeat(items, (item) => html`<li>${item}</li>`)
repeat(items, (item) => item.id, (item) => html`<li>${item.label}</li>`)
```

### repeatBy (keyed repeat)

There is no separate `repeatBy` export. `repeatBy` is the keyed form of `repeat`:

```js
repeat(items, keyFn, template)
```

Use the keyed form when list items can be re-ordered, inserted, or removed and you want stable identity.

```js
repeat(
  todos,
  (todo) => todo.id,
  (todo) => html`<todo-item .todo=${todo}></todo-item>`
)
```

### map directive

Use `map` for simple array mapping in templates.

```js
import { map, html } from '@vandeurenglenn/lite'

map(items, (item, i) => html`<li data-index=${i}>${item}</li>`)
```

### repeat decorator (lazy viewport rendering)

Use repeat as a decorator to lazily render list rows as placeholders enter the viewport.

```js
import { LiteElement, property, repeat, html, customElement } from '@vandeurenglenn/lite'

@customElement('big-list')
class BigList extends LiteElement {
  @property({ type: Array })
  accessor items = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `item-${i}` }))

  @repeat('items', (item) => html`<li>${item.label}</li>`, (item) => item.id)
  accessor visibleRows

  render() {
    return html`<ul>${this.visibleRows}</ul>`
  }
}
```

### provides/consumes

Basic data binding using pubsub.

#### consumes

```js
import { LiteElement, property, html, customElement } from '@vandeurenglenn/lite'

@customElement('consumer-el')
class ConsumerEl extends LiteElement {
  @property({ consumes: true, type: Array })
  accessor items

  @property({ consumes: 'someunique-id', type: Boolean })
  accessor drawerOpen

  render() {
    return html`${this.items.map((item) => html`${item}`)}`
  }
}
```

#### provides

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'

@customElement('provider-el')
class ProviderEl extends LiteElement {
  @property({ provides: true })
  accessor items = ['hello', 'world']

  @property({ provides: 'someunique-id', type: Boolean })
  accessor drawerOpen = false
}
```

#### query

```js
import { LiteElement, customElement, query, html } from '@vandeurenglenn/lite'

@customElement('query-el')
class QueryEl extends LiteElement {
  @query('my-item') accessor item

  render() {
    return html`<my-item></my-item>`
  }
}
```

#### queryAll

```js
import { LiteElement, customElement, queryAll, html } from '@vandeurenglenn/lite'

@customElement('query-all-el')
class QueryAllEl extends LiteElement {
  @queryAll('my-item') accessor items

  render() {
    return html`<my-item></my-item><my-item></my-item>`
  }
}
```

#### darkMode

```js
import { LiteElement, customElement, darkMode } from '@vandeurenglenn/lite'

@customElement('app-shell')
class AppShell extends LiteElement {
  @darkMode(true)
}
```

#### onChange

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'

@customElement('on-change-el')
class OnChangeEl extends LiteElement {
  @property({ type: Boolean })
  accessor drawerOpen = false

  onChange(propertyKey, value) {}
}
```

#### willChange

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'

@customElement('will-change-el')
class WillChangeEl extends LiteElement {
  @property({ type: Boolean })
  accessor drawerOpen = false

  willChange(propertyKey, value) {
    return value
  }
}
```

#### firstRender

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'

@customElement('first-render-el')
class FirstRenderEl extends LiteElement {
  @property({ type: Boolean })
  accessor drawerOpen = false

  firstRender() {}
}
```
