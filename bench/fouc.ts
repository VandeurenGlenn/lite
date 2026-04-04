import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { chromium } from 'playwright'

type Framework = 'lite' | 'lit'

type IterationResult = {
  durationMs: number
  framesUntilStyled: number
  foucOccurred: boolean
}

type Summary = {
  framework: Framework
  runs: number
  avgMs: number
  p95Ms: number
  maxMs: number
  minMs: number
  avgFrames: number
  foucRate: number
}

type FoucResult = {
  lite: Summary
  lit: Summary
  winner: 'Lite' | 'Lit' | 'Tie'
  fasterRatio: number
}

const ROOT = process.cwd()
const HOST = '127.0.0.1'
const PORT = 41773
const RUNS = 30
const EXPECTED_BG = 'rgb(12, 34, 56)'
const JSON_MODE = process.argv.includes('--json')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
}

const importMapHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>FOUC Bench</title>
    <script type="importmap">
      {
        "imports": {
          "lit": "/node_modules/lit/index.js",
          "lit-html": "/node_modules/lit-html/lit-html.js",
          "lit-html/is-server.js": "/node_modules/lit-html/is-server.js",
          "lit-element/lit-element.js": "/node_modules/lit-element/lit-element.js",
          "@lit/reactive-element": "/node_modules/@lit/reactive-element/reactive-element.js",
          "@lit/reactive-element/css-tag.js": "/node_modules/@lit/reactive-element/css-tag.js"
        }
      }
    </script>
  </head>
  <body></body>
</html>`

const startStaticServer = async () => {
  const server = createServer(async (req, res) => {
    try {
      const url = req.url ?? '/'
      if (url === '/' || url.startsWith('/?')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(importMapHtml)
        return
      }

      const safePath = normalize(decodeURIComponent(url)).replace(/^\/+/, '')
      const absolutePath = join(ROOT, safePath)
      if (!absolutePath.startsWith(ROOT)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }

      const content = await readFile(absolutePath)
      const mime = MIME[extname(absolutePath)] ?? 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' })
      res.end(content)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(PORT, HOST, () => resolve())
  })

  return server
}

const percentile = (sortedValues: number[], p: number) => {
  if (!sortedValues.length) return 0
  const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1))
  return sortedValues[idx]
}

const summarize = (framework: Framework, rows: IterationResult[]): Summary => {
  const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b)
  const totalDuration = durations.reduce((acc, v) => acc + v, 0)
  const avgFrames = rows.reduce((acc, r) => acc + r.framesUntilStyled, 0) / rows.length
  const foucCount = rows.filter((r) => r.foucOccurred).length

  return {
    framework,
    runs: rows.length,
    avgMs: totalDuration / rows.length,
    p95Ms: percentile(durations, 95),
    maxMs: durations[durations.length - 1] ?? 0,
    minMs: durations[0] ?? 0,
    avgFrames,
    foucRate: (foucCount / rows.length) * 100
  }
}

const runFramework = async (framework: Framework, runs: number): Promise<IterationResult[]> => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(`http://${HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' })

  const setupOk = await page.evaluate(`
    (async () => {
      const fw = ${JSON.stringify(framework)};
      const tag = fw === 'lite' ? 'fouc-bench-lite' : 'fouc-bench-lit';
      if (!customElements.get(tag)) {
        if (fw === 'lite') {
          const mod = await import('/www/lite.js');
          customElements.define(tag, class extends mod.LiteElement {
            static styles = mod.css\`
              #probe {
                width: 10px;
                height: 10px;
                background: rgb(12, 34, 56);
              }
            \`;
            render() { return mod.html\`<div id="probe"></div>\`; }
          });
        } else {
          const mod = await import('lit');
          customElements.define(tag, class extends mod.LitElement {
            static styles = mod.css\`
              #probe {
                width: 10px;
                height: 10px;
                background: rgb(12, 34, 56);
              }
            \`;
            render() { return mod.html\`<div id="probe"></div>\`; }
          });
        }
      }
      return !!customElements.get(tag);
    })()
  `)

  if (!setupOk) {
    await browser.close()
    throw new Error(`Failed to set up ${framework} benchmark element`)
  }

  const rows: IterationResult[] = []

  for (let i = 0; i < runs; i++) {
    const result = (await page.evaluate(`
      (async () => {
        const fw = ${JSON.stringify(framework)};
        const expectedBg = ${JSON.stringify(EXPECTED_BG)};
        const tag = fw === 'lite' ? 'fouc-bench-lite' : 'fouc-bench-lit';
        const el = document.createElement(tag);
        const start = performance.now();
        document.body.appendChild(el);

        const isStyled = () => {
          const probe = el.shadowRoot?.getElementById('probe') ?? null;
          if (!probe) return false;
          return getComputedStyle(probe).backgroundColor === expectedBg;
        };

        if (isStyled()) {
          const end = performance.now();
          el.remove();
          return { durationMs: end - start, framesUntilStyled: 0, foucOccurred: false };
        }

        let frames = 0;
        const end = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Style not applied within timeout')), 2000);
          const tick = () => {
            if (isStyled()) {
              clearTimeout(timeoutId);
              resolve(performance.now());
              return;
            }
            frames += 1;
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

        el.remove();
        return { durationMs: end - start, framesUntilStyled: frames, foucOccurred: frames > 0 };
      })()
    `)) as IterationResult

    rows.push(result)
  }

  await browser.close()
  return rows
}

const buildResult = (lite: Summary, lit: Summary): FoucResult => {
  const winner = lite.avgMs < lit.avgMs ? 'Lite' : lite.avgMs > lit.avgMs ? 'Lit' : 'Tie'
  const fasterRatio =
    lite.avgMs === lit.avgMs ? 1 : lite.avgMs < lit.avgMs ? lit.avgMs / lite.avgMs : lite.avgMs / lit.avgMs

  return { lite, lit, winner, fasterRatio }
}

const printSummary = ({ lite, lit, winner, fasterRatio }: FoucResult) => {
  console.log('\n' + '='.repeat(72))
  console.log('FOUC Benchmark Report (lower ms/frames is better)')
  console.table([
    {
      Framework: 'Lite',
      Runs: lite.runs,
      'Avg time to styled (ms)': lite.avgMs.toFixed(3),
      'P95 time (ms)': lite.p95Ms.toFixed(3),
      'Min/Max time (ms)': `${lite.minMs.toFixed(3)} / ${lite.maxMs.toFixed(3)}`,
      'Avg frames until styled': lite.avgFrames.toFixed(2),
      'FOUC rate': `${lite.foucRate.toFixed(1)}%`
    },
    {
      Framework: 'Lit',
      Runs: lit.runs,
      'Avg time to styled (ms)': lit.avgMs.toFixed(3),
      'P95 time (ms)': lit.p95Ms.toFixed(3),
      'Min/Max time (ms)': `${lit.minMs.toFixed(3)} / ${lit.maxMs.toFixed(3)}`,
      'Avg frames until styled': lit.avgFrames.toFixed(2),
      'FOUC rate': `${lit.foucRate.toFixed(1)}%`
    }
  ])

  if (winner === 'Tie') {
    console.log('Result: Lite and Lit are tied on average time to styled.')
  } else if (winner === 'Lite') {
    console.log(`Result: Lite reaches styled state ${fasterRatio.toFixed(2)}x faster than Lit on average.`)
  } else {
    console.log(`Result: Lit reaches styled state ${fasterRatio.toFixed(2)}x faster than Lite on average.`)
  }
  console.log('='.repeat(72) + '\n')
}

const main = async () => {
  const server = await startStaticServer()
  try {
    const [liteRows, litRows] = await Promise.all([runFramework('lite', RUNS), runFramework('lit', RUNS)])
    const result = buildResult(summarize('lite', liteRows), summarize('lit', litRows))
    if (!JSON_MODE) printSummary(result)
    console.log(`__FOUC_RESULT__${JSON.stringify(result)}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
}

main().catch((error) => {
  console.error('\nFOUC benchmark failed.')
  console.error(error instanceof Error ? error.message : error)
  console.error('If Chromium is missing, run: npx playwright install chromium')
  process.exit(1)
})
