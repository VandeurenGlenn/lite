# lite

## install

```sh
npm i @vandeurenglenn/lite
```

## usage

```js
import { LiteElement, property, query, state, html, css, customElement } from '@vandeurenglenn/lite'
@customElement('some-element')
class SomeElement extends LiteElement {
  @property()
  accessor items = ['hello', 'world']

  render() {
    return html`${this.items.map((item) => html`${item}`)}`
  }
}
```

### provides/consumes

basic data binding using pubsub

#### consumes

```js
import { LiteElement, property, html, customElement } from '@vandeurenglenn/lite'
@customElement
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
@customElement
class ProviderEl extends LiteElement {
  @property({ provides: true })
  accessor items = ['hello', 'world']

  @property({ provides: 'someunique-id', type: Boolean })
  accessor drawerOpen = false
}
```

#### onChange

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'
@customElement
class ProviderEl extends LiteElement {
  @property({ type: Boolean })
  accessor drawerOpen = false

  // runs after render
  onChange(propertyKey, value) {}
}
```

#### willChange

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'
@customElement
class ProviderEl extends LiteElement {
  @property({ type: Boolean })
  accessor drawerOpen = false

  // runs before render
  willChange(propertyKey, value) {
    return value // always return
  }
}
```

#### firstRender

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'
@customElement
class ProviderEl extends LiteElement {
  @property({ type: Boolean })
  accessor drawerOpen = false

  // runs after first render
  firstRender() {}
}
```
