# lite

## install

```sh
npm i @vandeurenglenn/lite
```

## usage

```js
import { LiteElement, property, query, state, html, css, customElement } from '@vandeurenglenn/lite'
@customElement
class SomeElement extends LiteElement {
  @property()
  items = ['hello', 'world']

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
  items

  @property({ consumes: 'someunique-id', type: Boolean })
  drawerOpen

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
  items = ['hello', 'world']

  @property({ provides: 'someunique-id', type: Boolean })
  drawerOpen = false
}
```

#### onChange

```js
import { LiteElement, property, customElement } from '@vandeurenglenn/lite'
@customElement
class ProviderEl extends LiteElement {
  @property({ type: Boolean })
  drawerOpen = false

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
  drawerOpen = false

  // runs before render
  willChange(propertyKey, value) {
    return value // always return
  }
}
```
