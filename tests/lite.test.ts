import { test } from 'uvu'
import * as assert from 'uvu/assert'
import './setup.js'
import { LiteElement, html, property, query, queryAll, customElement, map } from '../src/index.js'

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

  el.open = false
  await el.rendered
  assert.is(el.hasAttribute('open'), false)

  el.open = true
  await el.rendered
  assert.is(el.getAttribute('open'), '')
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

test.run()
