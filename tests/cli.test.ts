import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'

const waitForPort = (child: ReturnType<typeof spawn>) =>
  new Promise<number>((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error(`CLI did not start:\n${output}`)), 5000)

    child.stdout?.on('data', (chunk) => {
      output += chunk
      const match = output.match(/127\.0\.0\.1:(\d+)/)
      if (!match) return
      clearTimeout(timeout)
      resolve(Number(match[1]))
    })
    child.stderr?.on('data', (chunk) => {
      output += chunk
    })
    child.once('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`CLI exited with ${code}:\n${output}`))
    })
  })

test('CLI serves safe paths and blocks traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lite-cli-'))
  const secret = `${root}-secret.txt`
  await writeFile(join(root, 'index.html'), '<body>home</body>')
  await writeFile(join(root, 'app.js'), 'export const value = 1')
  await writeFile(secret, 'secret')
  await symlink(secret, join(root, 'secret-link.txt'))

  const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli/cli.ts', '--serve', root, '--port', '0'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  })

  try {
    const port = await waitForPort(child)
    const base = `http://127.0.0.1:${port}`

    const index = await fetch(`${base}/`)
    assert.is(index.status, 200)
    assert.is(await index.text(), '<body>home</body>')

    const script = await fetch(`${base}/app.js?cache=123`)
    assert.is(script.status, 200)
    assert.is(script.headers.get('content-type'), 'application/javascript; charset=utf-8')

    const head = await fetch(`${base}/app.js`, { method: 'HEAD' })
    assert.is(head.status, 200)
    assert.is(await head.text(), '')

    const traversal = await fetch(`${base}/%2e%2e%2f${basename(secret)}`)
    assert.is(traversal.status, 403)

    const symlinkEscape = await fetch(`${base}/secret-link.txt`)
    assert.is(symlinkEscape.status, 403)

    const malformed = await fetch(`${base}/%E0%A4%A`)
    assert.is(malformed.status, 400)

    const post = await fetch(`${base}/`, { method: 'POST' })
    assert.is(post.status, 405)
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGTERM')
      await once(child, 'exit')
    }
    await rm(root, { recursive: true, force: true })
    await unlink(secret).catch(() => {})
  }
})

test.run()
