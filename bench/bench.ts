import { ensureDom } from '../tests/setup.js'

ensureDom()

import { Bench } from 'tinybench'
import { LiteElement, html, property, customElement } from '../src/index.js'
import { LitElement, html as litHtml } from 'lit'

@customElement('lite-bench-element')
class LiteBenchElement extends LiteElement {
  @property({ type: Number, renders: false }) accessor count = 0
  render() {
    return html`<span>${this.count}</span>`
  }
}

class LitBenchElement extends LitElement {
  static properties = {
    count: { type: Number }
  }

  count = 0

  render() {
    return litHtml`<span>${this.count}</span>`
  }
}

if (!customElements.get('lit-bench-element-lit')) {
  customElements.define('lit-bench-element-lit', LitBenchElement)
}

const bench = new Bench({ time: 500 })
const MANY = 100

// Setup instances for property update tests
const liteUpdateInstance = document.createElement('lite-bench-element') as LiteBenchElement
const litUpdateInstance = document.createElement('lit-bench-element-lit') as LitBenchElement
document.body.append(liteUpdateInstance, litUpdateInstance)

// Setup many instances for batch property update tests
const liteManyUpdate: LiteBenchElement[] = []
const litManyUpdate: LitBenchElement[] = []
{
  const fragLite = document.createDocumentFragment()
  for (let i = 0; i < MANY; i++) {
    const el = document.createElement('lite-bench-element') as LiteBenchElement
    liteManyUpdate.push(el)
    fragLite.appendChild(el)
  }
  const fragLit = document.createDocumentFragment()
  for (let i = 0; i < MANY; i++) {
    const el = document.createElement('lit-bench-element-lit') as LitBenchElement
    litManyUpdate.push(el)
    fragLit.appendChild(el)
  }
  document.body.append(fragLite, fragLit)
}

bench.add('LiteElement create + first render', async () => {
  const el = document.createElement('lite-bench-element') as LiteBenchElement
  document.body.appendChild(el)
  await el.rendered
  document.body.removeChild(el)
})

bench.add('LitElement create + first render', async () => {
  const el = document.createElement('lit-bench-element-lit') as LitBenchElement
  document.body.appendChild(el)
  await el.updateComplete
  document.body.removeChild(el)
})

bench.add(`LiteElement create + first render x${MANY}`, async () => {
  const frag = document.createDocumentFragment()
  const list: LiteBenchElement[] = []
  for (let i = 0; i < MANY; i++) {
    const el = document.createElement('lite-bench-element') as LiteBenchElement
    list.push(el)
    frag.appendChild(el)
  }
  document.body.appendChild(frag)
  await Promise.all(list.map((el) => el.rendered))
  for (const el of list) el.remove()
})

bench.add(`LitElement create + first render x${MANY}`, async () => {
  const frag = document.createDocumentFragment()
  const list: LitBenchElement[] = []
  for (let i = 0; i < MANY; i++) {
    const el = document.createElement('lit-bench-element-lit') as LitBenchElement
    list.push(el)
    frag.appendChild(el)
  }
  document.body.appendChild(frag)
  await Promise.all(list.map((el) => el.updateComplete))
  for (const el of list) el.remove()
})

bench.add('LiteElement property update + render', () => {
  liteUpdateInstance.count++
  liteUpdateInstance.requestRender()
})

bench.add('LitElement property update + render', async () => {
  litUpdateInstance.count++
  await litUpdateInstance.updateComplete
})

bench.add(`LiteElement property update + render x${MANY}`, () => {
  for (let i = 0; i < MANY; i++) {
    const el = liteManyUpdate[i]
    el.count++
    el.requestRender()
  }
})

bench.add(`LitElement property update + render x${MANY}`, async () => {
  for (let i = 0; i < MANY; i++) {
    litManyUpdate[i].count++
  }
  await Promise.all(litManyUpdate.map((el) => el.updateComplete))
})

async function main() {
  await bench.run()
  const table = bench.table()
  console.table(table)

  console.log('\n' + '='.repeat(60))

  // Compare create + first render
  const liteCreateRow = table.find((row) => row['Task Name'].includes('LiteElement create'))
  const litCreateRow = table.find((row) => row['Task Name'].includes('LitElement create'))

  if (liteCreateRow && litCreateRow) {
    const liteOps = parseFloat(
      typeof liteCreateRow['ops/sec'] === 'string'
        ? liteCreateRow['ops/sec'].replace(/,/g, '')
        : String(liteCreateRow['ops/sec'])
    )
    const litOps = parseFloat(
      typeof litCreateRow['ops/sec'] === 'string'
        ? litCreateRow['ops/sec'].replace(/,/g, '')
        : String(litCreateRow['ops/sec'])
    )

    if (litOps > liteOps) {
      const ratio = (litOps / liteOps).toFixed(2)
      console.log(`🏆 Create + First Render: LitElement is ${ratio}x faster`)
    } else {
      const ratio = (liteOps / litOps).toFixed(2)
      console.log(`🏆 Create + First Render: LiteElement is ${ratio}x faster`)
    }
  }

  // Compare property updates
  const liteUpdateRow = table.find((row) => row['Task Name'].includes('LiteElement property'))
  const litUpdateRow = table.find((row) => row['Task Name'].includes('LitElement property'))

  if (liteUpdateRow && litUpdateRow) {
    const liteOps = parseFloat(
      typeof liteUpdateRow['ops/sec'] === 'string'
        ? liteUpdateRow['ops/sec'].replace(/,/g, '')
        : String(liteUpdateRow['ops/sec'])
    )
    const litOps = parseFloat(
      typeof litUpdateRow['ops/sec'] === 'string'
        ? litUpdateRow['ops/sec'].replace(/,/g, '')
        : String(litUpdateRow['ops/sec'])
    )

    if (litOps > liteOps) {
      const ratio = (litOps / liteOps).toFixed(2)
      console.log(`🏆 Property Updates: LitElement is ${ratio}x faster`)
    } else {
      const ratio = (liteOps / litOps).toFixed(2)
      console.log(`🏆 Property Updates: LiteElement is ${ratio}x faster`)
    }
  }

  console.log('='.repeat(60) + '\n')

  // Initialize initial renders for many update instances once
  await Promise.all(liteManyUpdate.map((el) => el.rendered))
  await Promise.all(litManyUpdate.map((el) => el.updateComplete))

  // Cleanup
  document.body.removeChild(liteUpdateInstance)
  document.body.removeChild(litUpdateInstance)
  for (const el of liteManyUpdate) el.remove()
  for (const el of litManyUpdate) el.remove()
}

main()
