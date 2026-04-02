import { readFileSync, existsSync } from 'fs'

interface TestResult {
  title: string
  status: 'passed' | 'failed' | 'skipped' | 'timedOut'
  errors?: { message: string }[]
}

interface Suite {
  title: string
  suites?: Suite[]
  tests?: TestResult[]
}

interface Report {
  suites: Suite[]
}

function collectTests(
  suite: Suite,
  results: { spec: string; test: string; status: string; error?: string }[],
) {
  const specName = suite.title
  for (const test of suite.tests ?? []) {
    results.push({
      spec: specName,
      test: test.title,
      status: test.status,
      error: test.errors?.[0]?.message?.split('\n')[0],
    })
  }
  for (const child of suite.suites ?? []) {
    collectTests(child, results)
  }
}

const reportPath = 'playwright-report/results.json'
if (!existsSync(reportPath)) {
  console.log('No report found. Run: npm run test:e2e first.')
  process.exit(0)
}

const report: Report = JSON.parse(readFileSync(reportPath, 'utf-8'))
const results: { spec: string; test: string; status: string; error?: string }[] = []

for (const suite of report.suites) {
  collectTests(suite, results)
}

const passed = results.filter((r) => r.status === 'passed')
const failed = results.filter((r) => r.status !== 'passed' && r.status !== 'skipped')

console.log('\n=== Beta Tester Gap Report ===\n')

const bySpec: Record<string, typeof results> = {}
for (const r of results) {
  ;(bySpec[r.spec] ??= []).push(r)
}

for (const [spec, tests] of Object.entries(bySpec)) {
  const allPassed = tests.every((t) => t.status === 'passed')
  const icon = allPassed ? '✅' : '❌'
  const passCount = tests.filter((t) => t.status === 'passed').length
  console.log(`${icon} ${spec.padEnd(30)} ${passCount}/${tests.length} passed`)
  for (const t of tests.filter((t) => t.status !== 'passed')) {
    console.log(`   ⚠  ${t.test}`)
    if (t.error) console.log(`      ${t.error.slice(0, 100)}`)
  }
}

console.log(`\n${failed.length} gap(s) found, ${passed.length} passed.\n`)
if (failed.length > 0) process.exit(1)
