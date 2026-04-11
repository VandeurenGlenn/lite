import { test } from 'uvu'
import * as assert from 'uvu/assert'
import './setup.js'
import { LiteElement, html, property, query, queryAll, customElement, map, repeat } from '../src/index.js'
import { arrayRepeat as arrayRepeatHelper } from '../src/helpers.js'

let tagCounter = 0
const nextTag = (base = 'lite-spec') => `${base}-${++tagCounter}`

test('customElement registers and renders', async () => {
  const tag = nextTag('lite-basic')
  @customElement(tag)
  class BasicEl extends LiteElement {
    render() {
      return html`<div id="content">hello</div>`
    }
  }

  const el = document.createElement(tag) as BasicEl
  document.body.appendChild(el)
  await el.rendered

  assert.is(customElements.get(tag), BasicEl)
  const content = el.shadowRoot?.querySelector('#content')
  assert.ok(content)
  assert.is(content?.textContent, 'hello')
})

test('property decorator reflects attributes and toggles boolean', async () => {
  const tag = nextTag('lite-prop')
  @customElement(tag)
  class PropEl extends LiteElement {
    @property({ type: Boolean, reflect: true }) accessor open = false
    render() {
      return html`<div></div>`
    }
  }

  const el = document.createElement(tag) as PropEl
  document.body.appendChild(el)
  await el.rendered

  el.setAttribute('open', '')
  assert.is(el.open, true)

  el.open = true
  await el.rendered
  assert.is(el.getAttribute('open'), '')

  el.open = false
  await el.rendered
  assert.is(el.hasAttribute('open'), false)
  assert.is(el.open, false)
})

test('attribute updates property without reflect', async () => {
  const tag = nextTag('lite-attr-no-reflect')

  @customElement(tag)
  class AttrNoReflectEl extends LiteElement {
    @property({ type: String }) accessor title = 'initial'

    render() {
      return html`<div>${this.title}</div>`
    }
  }

  const el = document.createElement(tag) as AttrNoReflectEl
  document.body.appendChild(el)
  await el.rendered

  el.setAttribute('title', 'from-attr')
  assert.is(el.title, 'from-attr')
})

test('custom attribute name maps back to property key', async () => {
  const tag = nextTag('lite-custom-attr')

  @customElement(tag)
  class CustomAttrEl extends LiteElement {
    @property({ type: Boolean, reflect: true, attribute: 'is-open' }) accessor isOpen = false

    render() {
      return html`<div></div>`
    }
  }

  const el = document.createElement(tag) as CustomAttrEl
  document.body.appendChild(el)
  await el.rendered

  el.setAttribute('is-open', '')
  assert.is(el.isOpen, true)

  el.removeAttribute('is-open')
  assert.is(el.isOpen, false)

  el.isOpen = true
  await el.rendered
  assert.is(el.hasAttribute('is-open'), true)
})

test('camelCase property maps to kebab-case attribute by default', async () => {
  const tag = nextTag('lite-camel-attr')

  @customElement(tag)
  class CamelAttrEl extends LiteElement {
    @property({ type: Boolean, reflect: true }) accessor isOpen = false

    render() {
      return html`<div></div>`
    }
  }

  const el = document.createElement(tag) as CamelAttrEl
  document.body.appendChild(el)
  await el.rendered

  el.setAttribute('is-open', '')
  assert.is(el.isOpen, true)

  el.removeAttribute('is-open')
  assert.is(el.isOpen, false)

  el.isOpen = true
  await el.rendered
  assert.is(el.hasAttribute('is-open'), true)
})

test('number attribute keeps 0 when reflected', async () => {
  const tag = nextTag('lite-number-attr')

  @customElement(tag)
  class NumberAttrEl extends LiteElement {
    @property({ type: Number, reflect: true }) accessor count = 1

    render() {
      return html`<div>${this.count}</div>`
    }
  }

  const el = document.createElement(tag) as NumberAttrEl
  document.body.appendChild(el)
  await el.rendered

  el.setAttribute('count', '0')
  assert.is(el.count, 0)

  el.count = 0
  await el.rendered
  assert.is(el.getAttribute('count'), '0')
})

test('string attribute keeps empty string when reflected', async () => {
  const tag = nextTag('lite-string-attr')

  @customElement(tag)
  class StringAttrEl extends LiteElement {
    @property({ type: String, reflect: true }) accessor label = 'default'

    render() {
      return html`<div>${this.label}</div>`
    }
  }

  const el = document.createElement(tag) as StringAttrEl
  document.body.appendChild(el)
  await el.rendered

  el.setAttribute('label', '')
  assert.is(el.label, '')

  el.label = ''
  await el.rendered
  assert.is(el.getAttribute('label'), '')
})

test('provides/consumes synchronizes values', async () => {
  const channel = `channel-${Date.now()}`
  const providerTag = nextTag('lite-provider')
  const consumerTag = nextTag('lite-consumer')

  @customElement(providerTag)
  class ProviderEl extends LiteElement {
    @property({ provides: channel }) accessor value = 'hello'
    render() {
      return html`<div></div>`
    }
  }

  @customElement(consumerTag)
  class ConsumerEl extends LiteElement {
    @property({ consumes: channel }) accessor value: string
    render() {
      return html`<div></div>`
    }
  }

  const provider = document.createElement(providerTag) as ProviderEl
  const consumer = document.createElement(consumerTag) as ConsumerEl
  document.body.append(provider, consumer)
  await Promise.all([provider.rendered, consumer.rendered])

  assert.is(consumer.value, 'hello')

  provider.value = 'updated'
  await consumer.rendered
  assert.is(consumer.value, 'updated')
})

test('query and queryAll locate elements in shadow DOM', async () => {
  const tag = nextTag('lite-query')
  @customElement(tag)
  class QueryEl extends LiteElement {
    @query('.inner') accessor firstInner: HTMLElement
    @queryAll('.inner') accessor inners: HTMLElement[]

    render() {
      return html`<div class="inner">first</div>
        <div class="inner">second</div>`
    }
  }

  const el = document.createElement(tag) as QueryEl
  document.body.appendChild(el)
  await el.rendered

  assert.ok(el.firstInner)
  assert.is(el.firstInner.textContent, 'first')
  assert.is(el.inners.length, 2)
  assert.is(el.inners[1].textContent, 'second')
})

test('map directive maps arrays', () => {
  const items = [1, 2, 3]
  const doubled = map(items, (x) => x * 2)
  assert.equal(doubled, [2, 4, 6])
})

test('repeat directive maps arrays', () => {
  const items = [1, 2, 3]
  const doubled = repeat(items, (x) => x * 2)
  assert.equal(doubled, [2, 4, 6])
})

test('repeat directive supports keyed signature', () => {
  const items = [
    { id: 'a', value: 1 },
    { id: 'b', value: 2 }
  ]
  const mapped = repeat(
    items,
    (item) => item.id,
    (item) => item.value
  )
  assert.equal(mapped, [1, 2])
})

test('arrayRepeat helper returns empty list for missing items', () => {
  const result = arrayRepeatHelper(undefined, (item) => item)
  assert.equal(result, [])
})

test('repeat decorator renders and updates repeated templates', async () => {
  const tag = nextTag('lite-array-repeat')

  @customElement(tag)
  class ArrayRepeatEl extends LiteElement {
    @property({ type: Array }) accessor items = [1, 2, 3]

    @repeat<number>('items', (item) => html`<li class="item">${item}</li>`, (item) => item)
    accessor repeatedItems: unknown

    render() {
      return html`<ul>
        ${this.repeatedItems}
      </ul>`
    }
  }

  const el = document.createElement(tag) as ArrayRepeatEl
  document.body.appendChild(el)
  await el.rendered

  const text = Array.from(el.shadowRoot?.querySelectorAll('.item') ?? []).map((node) => node.textContent)
  assert.equal(text, ['1', '2', '3'])

  el.items = [3, 2, 1]
  await el.rendered

  const updatedText = Array.from(el.shadowRoot?.querySelectorAll('.item') ?? []).map((node) => node.textContent)
  assert.equal(updatedText, ['3', '2', '1'])
})

test('repeat decorator only renders intersecting items when IntersectionObserver is available', async () => {
  const originalIO = (globalThis as any).IntersectionObserver

  class FakeIntersectionObserver {
    static instances: FakeIntersectionObserver[] = []
    callback: IntersectionObserverCallback
    target: Element | null = null

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
      FakeIntersectionObserver.instances.push(this)
    }

    observe(target: Element) {
      this.target = target
    }

    disconnect() {}

    triggerIntersecting() {
      if (!this.target) return
      this.callback([{ isIntersecting: true, target: this.target } as IntersectionObserverEntry], this as any)
    }
  }

  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver as any

  const tag = nextTag('lite-array-repeat-lazy')

  @customElement(tag)
  class LazyArrayRepeatEl extends LiteElement {
    @property({ type: Array }) accessor items = [1, 2, 3, 4]

    @repeat<number>('items', (item) => html`<li class="lazy-item">${item}</li>`, (item) => item)
    accessor repeatedItems: unknown

    render() {
      return html`<ul>
        ${this.repeatedItems}
      </ul>`
    }
  }

  const el = document.createElement(tag) as LazyArrayRepeatEl
  document.body.appendChild(el)
  await el.rendered

  assert.is(el.shadowRoot?.querySelectorAll('.lazy-item').length, 0)

  FakeIntersectionObserver.instances[0]?.triggerIntersecting()
  FakeIntersectionObserver.instances[1]?.triggerIntersecting()

  assert.is(el.shadowRoot?.querySelectorAll('.lazy-item').length, 2)
  ;(globalThis as any).IntersectionObserver = originalIO
})

test.run()
