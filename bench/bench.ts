import { spawnSync } from 'node:child_process'

const MANY = 100
const parseOps = (value: string | number) =>
  parseFloat(typeof value === 'string' ? value.replace(/,/g, '') : String(value))

type BenchRow = {
  'Task name': string
  'Throughput avg (ops/s)': string | number
}

type SuiteResult = {
  suite: 'create' | 'update'
  framework: 'lite' | 'lit'
  table: BenchRow[]
}

type FoucSummary = {
  framework: 'lite' | 'lit'
  runs: number
  avgMs: number
  p95Ms: number
  maxMs: number
  minMs: number
  avgFrames: number
  foucRate: number
}

type FoucResult = {
  lite: FoucSummary
  lit: FoucSummary
  winner: 'Lite' | 'Lit' | 'Tie'
  fasterRatio: number
}

type MetricSummaryRow = {
  Metric: string
  liteOps: number
  litOps: number
  'Lite ops/sec': string
  'Lit ops/sec': string
  Winner: 'Lite' | 'Lit' | 'Tie'
  Ratio: string
  Lead: string
  leadPercent: number
  Verdict: 'Near tie' | 'Clear win'
}

const NEAR_TIE_THRESHOLD_PERCENT = 3

const runSuite = (suite: 'create' | 'update', framework: 'lite' | 'lit') => {
  const result = spawnSync('tsx', ['bench/run-suite.ts', suite, framework], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  const markerLine = result.stdout.split('\n').find((line) => line.startsWith('__BENCH_RESULT__'))

  if (!markerLine) {
    throw new Error(`No benchmark result marker found for ${framework} ${suite}`)
  }

  return JSON.parse(markerLine.slice('__BENCH_RESULT__'.length)) as SuiteResult
}

const runFouc = (): FoucResult => {
  const result = spawnSync('tsx', ['bench/fouc.ts', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })

  if (result.stderr) process.stderr.write(result.stderr)

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  const markerLine = result.stdout.split('\n').find((line) => line.startsWith('__FOUC_RESULT__'))
  if (!markerLine) {
    throw new Error('No FOUC result marker found')
  }

  return JSON.parse(markerLine.slice('__FOUC_RESULT__'.length)) as FoucResult
}

const compareRows = (
  liteTable: BenchRow[],
  litTable: BenchRow[],
  liteTaskName: string,
  litTaskName: string,
  label: string
): MetricSummaryRow | null => {
  const liteRow = liteTable.find((row) => row['Task name'] === liteTaskName)
  const litRow = litTable.find((row) => row['Task name'] === litTaskName)

  if (!liteRow || !litRow) return null

  // Use 'Throughput avg (ops/s)' for ops/sec
  const liteOps = parseOps(liteRow['Throughput avg (ops/s)'])
  const litOps = parseOps(litRow['Throughput avg (ops/s)'])
  const winner: 'Lite' | 'Lit' | 'Tie' = liteOps === litOps ? 'Tie' : liteOps > litOps ? 'Lite' : 'Lit'
  const maxOps = Math.max(liteOps, litOps)
  const minOps = Math.min(liteOps, litOps)
  const ratio = minOps === 0 ? Infinity : maxOps / minOps
  const leadPercent = minOps === 0 ? Infinity : ((maxOps - minOps) / minOps) * 100
  const verdict: 'Near tie' | 'Clear win' = leadPercent < NEAR_TIE_THRESHOLD_PERCENT ? 'Near tie' : 'Clear win'

  return {
    Metric: label,
    liteOps,
    litOps,
    'Lite ops/sec': liteOps.toLocaleString(),
    'Lit ops/sec': litOps.toLocaleString(),
    Winner: winner,
    Ratio: Number.isFinite(ratio) ? `${ratio.toFixed(2)}x` : '∞',
    Lead: Number.isFinite(leadPercent) ? `${leadPercent.toFixed(1)}%` : '∞',
    leadPercent,
    Verdict: verdict
  }
}

const printWinnerBreakdown = (rows: MetricSummaryRow[]) => {
  const liteWins = rows.filter((row) => row.Winner === 'Lite').length
  const litWins = rows.filter((row) => row.Winner === 'Lit').length
  const ties = rows.filter((row) => row.Winner === 'Tie').length

  console.log('\nOverall result')
  console.log(`Lite wins ${liteWins}/${rows.length} metrics`)
  console.log(`Lit wins ${litWins}/${rows.length} metrics`)
  if (ties) console.log(`Ties: ${ties}`)
}

const printWinnerHeadlines = (rows: MetricSummaryRow[]) => {
  console.log('\nMetric verdicts')
  for (const row of rows) {
    if (row.Winner === 'Tie') {
      console.log(`- ${row.Metric}: Lite and Lit are tied (${row.Ratio})`)
      continue
    }

    if (row.Winner === 'Lite') {
      console.log(
        `- ${row.Metric}: Lite is ${row.Ratio} faster than Lit (${row.Lead} lead, ${row.Verdict.toLowerCase()})`
      )
    } else {
      console.log(
        `- ${row.Metric}: Lit is ${row.Ratio} faster than Lite (${row.Lead} lead, ${row.Verdict.toLowerCase()})`
      )
    }
  }
}

const printScoreboard = (rows: MetricSummaryRow[]) => {
  console.log('\nBenchmark Scoreboard (higher ops/sec wins)')
  console.table(
    rows.map((row) => ({
      Metric: row.Metric,
      Winner: row.Winner,
      Ratio: row.Ratio,
      Lead: row.Lead,
      Verdict: row.Verdict,
      'Lite ops/sec': row['Lite ops/sec'],
      'Lit ops/sec': row['Lit ops/sec']
    }))
  )
}

const printFoucSummary = (fouc: FoucResult) => {
  console.log('\nFOUC Summary (lower ms/frames is better)')
  console.table([
    {
      Framework: 'Lite',
      Runs: fouc.lite.runs,
      'Avg time to styled (ms)': fouc.lite.avgMs.toFixed(3),
      'P95 time (ms)': fouc.lite.p95Ms.toFixed(3),
      'Avg frames until styled': fouc.lite.avgFrames.toFixed(2),
      'FOUC rate': `${fouc.lite.foucRate.toFixed(1)}%`
    },
    {
      Framework: 'Lit',
      Runs: fouc.lit.runs,
      'Avg time to styled (ms)': fouc.lit.avgMs.toFixed(3),
      'P95 time (ms)': fouc.lit.p95Ms.toFixed(3),
      'Avg frames until styled': fouc.lit.avgFrames.toFixed(2),
      'FOUC rate': `${fouc.lit.foucRate.toFixed(1)}%`
    }
  ])

  if (fouc.winner === 'Tie') {
    console.log('FOUC verdict: Lite and Lit are tied on average time to styled.')
  } else if (fouc.winner === 'Lite') {
    console.log(`FOUC verdict: Lite reaches styled state ${fouc.fasterRatio.toFixed(2)}x faster than Lit.`)
  } else {
    console.log(`FOUC verdict: Lit reaches styled state ${fouc.fasterRatio.toFixed(2)}x faster than Lite.`)
  }
}

console.log('[DEBUG] Starting Lite create suite')
const liteCreate = runSuite('create', 'lite')
console.log('[DEBUG] Finished Lite create suite')
const litCreate = runSuite('create', 'lit')
console.log('[DEBUG] Finished Lit create suite')
const liteUpdate = runSuite('update', 'lite')
console.log('[DEBUG] Finished Lite update suite')
const litUpdate = runSuite('update', 'lit')
console.log('[DEBUG] Finished Lit update suite')
const fouc = runFouc()
console.log('[DEBUG] Finished FOUC suite')

const metricConfigs = [
  {
    liteTable: liteCreate.table,
    litTable: litCreate.table,
    liteTask: 'LiteElement create + first render',
    litTask: 'LitElement create + first render',
    label: 'Create + First Render'
  },
  {
    liteTable: liteCreate.table,
    litTable: litCreate.table,
    liteTask: `LiteElement create + first render x${MANY}`,
    litTask: `LitElement create + first render x${MANY}`,
    label: `Create + First Render x${MANY}`
  },
  {
    liteTable: liteUpdate.table,
    litTable: litUpdate.table,
    liteTask: 'LiteElement render cycle (requestRender only)',
    litTask: 'LitElement render cycle (requestUpdate only)',
    label: 'Render Cycle Only'
  },
  {
    liteTable: liteUpdate.table,
    litTable: litUpdate.table,
    liteTask: `LiteElement render cycle (requestRender only) x${MANY}`,
    litTask: `LitElement render cycle (requestUpdate only) x${MANY}`,
    label: `Render Cycle Only x${MANY}`
  },
  {
    liteTable: liteUpdate.table,
    litTable: litUpdate.table,
    liteTask: 'LiteElement property update + render',
    litTask: 'LitElement property update + render',
    label: 'Property Updates'
  },
  {
    liteTable: liteUpdate.table,
    litTable: litUpdate.table,
    liteTask: `LiteElement property update + render x${MANY}`,
    litTask: `LitElement property update + render x${MANY}`,
    label: `Property Updates x${MANY}`
  }
]

const summaryRows = metricConfigs
  .map((config) => compareRows(config.liteTable, config.litTable, config.liteTask, config.litTask, config.label))
  .filter((row): row is MetricSummaryRow => !!row)

console.log('\n' + '='.repeat(72))
console.log('Lite vs Lit Benchmark Report')
console.log(`Near tie threshold: < ${NEAR_TIE_THRESHOLD_PERCENT}% lead`)
printScoreboard(summaryRows)
printWinnerHeadlines(summaryRows)
printWinnerBreakdown(summaryRows)
printFoucSummary(fouc)
console.log('='.repeat(72) + '\n')
console.log('[DEBUG] Benchmark script completed successfully')
