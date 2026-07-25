import http from 'node:http'
import { readFile, realpath, watch } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { WebSocketServer } from 'ws'

const args = process.argv.slice(2)
let port = 8000
let directory = 'www'
let sourceDirectory = 'src'
let watches = false

const readPort = (value: string | undefined, flag: string) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`${flag} must be an integer between 0 and 65535`)
  }
  return parsed
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '-p' || arg === '--port') {
    port = readPort(args[++i], arg)
  } else if (arg === '-s' || arg === '--serve') {
    const value = args[++i]
    if (!value) throw new Error(`${arg} requires a directory`)
    directory = value
  } else if (arg === '-w' || arg === '--watch') {
    watches = true
    const value = args[i + 1]
    if (value && !value.startsWith('-')) sourceDirectory = args[++i]
  } else if (arg === '-d' || arg === '--dev' || arg === '--development') {
    watches = true
  }
}

const serveRoot = await realpath(path.resolve(process.cwd(), directory))
const watchRoot = path.resolve(process.cwd(), sourceDirectory)

const contentTypes = new Map([
  ['.html', 'text/html'],
  ['.js', 'application/javascript'],
  ['.mjs', 'application/javascript'],
  ['.css', 'text/css'],
  ['.json', 'application/json'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
])

const isInside = (root: string, target: string) => {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

const send = (res: http.ServerResponse, status: number, body: string) => {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    send(res, 405, 'Method Not Allowed')
    return
  }

  let pathname: string
  try {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost')
    pathname = decodeURIComponent(requestUrl.pathname)
  } catch {
    send(res, 400, 'Bad Request')
    return
  }

  if (pathname.includes('\0')) {
    send(res, 400, 'Bad Request')
    return
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const candidate = path.resolve(serveRoot, `.${requestedPath}`)
  if (!isInside(serveRoot, candidate)) {
    send(res, 403, 'Forbidden')
    return
  }

  try {
    const filePath = await realpath(candidate)
    if (!isInside(serveRoot, filePath)) {
      send(res, 403, 'Forbidden')
      return
    }

    const extension = path.extname(filePath).toLowerCase()
    const contentType = contentTypes.get(extension) ?? 'application/octet-stream'
    const isText =
      contentType.startsWith('text/') ||
      contentType === 'application/json' ||
      contentType === 'application/javascript' ||
      contentType === 'image/svg+xml'
    let content: string | Buffer = await readFile(filePath, isText ? 'utf8' : undefined)

    if (watches && filePath.endsWith('index.html') && typeof content === 'string') {
      const script = `
          <script>
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(protocol + '//' + window.location.host);
            ws.onmessage = ({ data }) => data === 'reload' && window.location.reload();
          </script>
        `
      content = content.replace('</body>', `${script}</body>`)
    }

    res.writeHead(200, {
      'Content-Type': `${contentType}${isText ? '; charset=utf-8' : ''}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    })
    res.end(req.method === 'HEAD' ? undefined : content)
  } catch {
    send(res, 404, 'Not Found')
  }
})

let wss: WebSocketServer | undefined
let builder: ReturnType<typeof spawn> | undefined
const watchController = new AbortController()

if (watches) {
  wss = new WebSocketServer({ server })

  const startWatcher = async () => {
    try {
      const watcher = watch(watchRoot, { signal: watchController.signal })
      for await (const event of watcher) {
        if (event.eventType !== 'change') continue
        wss?.clients.forEach((client) => {
          if (client.readyState === 1) client.send('reload')
        })
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.error(`Watcher failed: ${error?.message ?? error}`)
    }
  }

  void startWatcher()
  builder = spawn('npm', ['run', 'watch'], { stdio: 'inherit' })
}

let shuttingDown = false
const shutdown = () => {
  if (shuttingDown) return
  shuttingDown = true
  watchController.abort()
  builder?.kill()
  wss?.close()
  server.close()
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

server.listen(port, '127.0.0.1', () => {
  const address = server.address()
  const activePort = typeof address === 'object' && address ? address.port : port
  console.log(`Serving "${serveRoot}" at http://127.0.0.1:${activePort}/`)
})
