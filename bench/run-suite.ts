import { Bench } from 'tinybench'
import { MANY, createLite, createLit, parseOps } from './shared.js'

type Suite = 'create' | 'update'
type Framework = 'lite' | 'lit'

const suite = process.argv[2] as Suite | undefined
const framework = process.argv[3] as Framework | undefined

if (!suite || !framework) {
  console.error('Usage: tsx bench/run-suite.ts <create|update> <lite|lit>')
  process.exit(1)
}

const bench = new Bench({ time: 500 })

if (suite === 'create') {
  if (framework === 'lite') {
    console.log('[DEBUG] Adding LiteElement create + first render')
    bench.add('LiteElement create + first render', async () => {
      const el = createLite()
      document.body.appendChild(el)
      await el.rendered
      // Test attribute reflection
      el.setAttribute('active', '')
      await el.rendered
      if (el.active !== true) throw new Error('Boolean attribute reflection failed')
      el.removeAttribute('active')
      await el.rendered
      if (el.active !== false) throw new Error('Boolean attribute removal reflection failed')
      el.remove()
    })

    console.log(`[DEBUG] Adding LiteElement create + first render x${MANY}`)
    bench.add(`LiteElement create + first render x${MANY}`, async () => {
      const frag = document.createDocumentFragment()
      const list = Array.from({ length: MANY }, () => createLite())
      for (const el of list) frag.appendChild(el)
      document.body.appendChild(frag)
      await Promise.all(list.map((el) => el.rendered))
      for (const el of list) el.remove()
    })
  } else {
    console.log('[DEBUG] Adding LitElement create + first render')
    bench.add('LitElement create + first render', async () => {
      const el = createLit()
      document.body.appendChild(el)
      await el.updateComplete
      el.setAttribute('active', '')
      await el.updateComplete
      if ((el as any).active !== true) throw new Error('Lit boolean attribute reflection failed')
      el.removeAttribute('active')
      await el.updateComplete
      if ((el as any).active !== false) throw new Error('Lit boolean attribute removal reflection failed')
      el.remove()
    })

    console.log(`[DEBUG] Adding LitElement create + first render x${MANY}`)
    bench.add(`LitElement create + first render x${MANY}`, async () => {
      const frag = document.createDocumentFragment()
      const list = Array.from({ length: MANY }, () => createLit())
      for (const el of list) frag.appendChild(el)
      document.body.appendChild(frag)
      await Promise.all(list.map((el) => el.updateComplete))
      for (const el of list) el.remove()
    })
  }
}

if (suite === 'update') {
  if (framework === 'lite') {
    const single = createLite()
    document.body.appendChild(single)
    await single.rendered

    const many = Array.from({ length: MANY }, () => createLite())
    const frag = document.createDocumentFragment()
    for (const el of many) frag.appendChild(el)
    document.body.appendChild(frag)
    await Promise.all(many.map((el) => el.rendered))

    bench.add('LiteElement render cycle (requestRender only)', () => {
      single.requestRender()
    })

    bench.add(`LiteElement render cycle (requestRender only) x${MANY}`, () => {
      for (let i = 0; i < MANY; i++) {
        many[i].requestRender()
      }
    })

    bench.add('LiteElement property update + render', () => {
      single.count++
      single.requestRender()
    })

    bench.add(`LiteElement property update + render x${MANY}`, () => {
      for (let i = 0; i < MANY; i++) {
        const el = many[i]
        el.count++
        el.requestRender()
      }
    })
  } else {
    const single = createLit()
    document.body.appendChild(single)
    await single.updateComplete

    const many = Array.from({ length: MANY }, () => createLit())
    const frag = document.createDocumentFragment()
    for (const el of many) frag.appendChild(el)
    document.body.appendChild(frag)
    await Promise.all(many.map((el) => el.updateComplete))

    bench.add('LitElement render cycle (requestUpdate only)', async () => {
      single.requestUpdate()
      await single.updateComplete
    })

    bench.add(`LitElement render cycle (requestUpdate only) x${MANY}`, async () => {
      for (let i = 0; i < MANY; i++) {
        many[i].requestUpdate()
      }
      await Promise.all(many.map((el) => el.updateComplete))
    })

    bench.add('LitElement property update + render', async () => {
      single.count++
      single.requestUpdate()
      await single.updateComplete
    })

    bench.add(`LitElement property update + render x${MANY}`, async () => {
      for (let i = 0; i < MANY; i++) {
        many[i].count++
        many[i].requestUpdate()
      }
      await Promise.all(many.map((el) => el.updateComplete))
    })
  }
}

console.log('[DEBUG] Running benchmark suite')
await bench.run()
const table = bench.table()
console.log(`[DEBUG] Finished running suite, table has ${table.length} rows`)
console.log(`\n[${framework.toUpperCase()} ${suite.toUpperCase()} SUITE]`)
console.table(table)
console.log(`__BENCH_RESULT__${JSON.stringify({ suite, framework, table })}`)
