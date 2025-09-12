import http from 'http'
import { readFile, watch } from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { WebSocketServer } from 'ws' // <-- Add this

// Basic frame encoder (text only)
function encode(str) {
  const payload = Buffer.from(str)
  return Buffer.concat([Buffer.from([0x81, payload.length]), payload])
}

// Parse CLI arguments
const args = process.argv.slice(2)
let port = 8000 // Default port
let wsPort = 8001 // Default WebSocket port
// Default directory to serve files from
let directory = 'www'
// Default source directory for development
let sourceDirectory = 'src'
let watches = false

console.log(`Starting server with arguments: ${args.join(' ')}`)

args.forEach((arg, i) => {
  if ((arg === '-p' || arg === '--port') && args[i + 1]) {
    port = parseInt(args[i + 1], 10)
  }
  if ((arg === '-s' || arg === '--serve') && args[i + 1]) {
    if (args[i + 1] && !args[i + 1].startsWith('--') && !args[i + 1].startsWith('-')) directory = args[i + 1]
  }
  if (arg === '-w' || arg === '--watch') {
    watches = true
    if (args[i + 1] && !args[i + 1].startsWith('--') && !args[i + 1].startsWith('-')) {
      sourceDirectory = args[i + 1]
    }
  }
  if ((arg === '-ws' || arg === '--ws-port') && args[i + 1]) {
    if (args[i + 1] && !args[i + 1].startsWith('--') && !args[i + 1].startsWith('-')) {
      wsPort = parseInt(args[i + 1], 10)
    }
  }
  if (arg === '-d' || arg === '--dev' || arg === '--development') {
    watches = true
  }
})

const DIRECTORY = path.resolve(process.cwd(), directory)

const server = http.createServer(async (req, res) => {
  let filePath = path.join(DIRECTORY, req.url === '/' ? 'index.html' : req.url)
  const extname = path.extname(filePath)
  let contentType = 'text/html'

  switch (extname) {
    case '.html':
      contentType = 'text/html'
      break
    case '.js':
      contentType = 'application/javascript'
      break
    case '.css':
      contentType = 'text/css'
      break
    case '.json':
      contentType = 'application/json'
      break
    case '.png':
      contentType = 'image/png'
      break
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg'
      break
    case '.gif':
      contentType = 'image/gif'
      break
    case '.svg':
      contentType = 'image/svg+xml'
      break
    case '.txt':
      contentType = 'text/plain'
      break
    case '.woff':
      contentType = 'font/woff'
      break
    case '.woff2':
      contentType = 'font/woff2'
      break
    default:
      contentType = 'application/octet-stream'
  }

  try {
    const isText =
      contentType.startsWith('text/') ||
      contentType === 'application/json' ||
      contentType === 'application/javascript' ||
      contentType === 'image/svg+xml'

    if (isText) {
      const content = await readFile(filePath, 'utf-8')
      if (filePath.endsWith('index.html')) {
        // Inject a script to reload the page on WebSocket message
        const script = `
          <script>
            const ws = new WebSocket('ws://' + window.location.host);
            ws.onopen = () => console.log('WebSocket open');
            ws.onerror = (e) => console.error('WebSocket error', e);
            ws.onclose = () => console.log('WebSocket closed');
            ws.onmessage = function(event) {
              console.log('WebSocket message received:', event.data);
              if (event.data === 'reload') {
                window.location.reload();
              }
            };
          </script>
        `
        const modifiedContent = content.replace('</body>', `${script}</body>`)
        res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' })
        res.end(modifiedContent)
        console.log(`Served ${filePath} with WebSocket reload script`)

        return
      }
      res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' })
      res.end(content)
    } else {
      const content = await readFile(filePath)
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error)
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('404 Not Found')
    return
  }
})

let wss: WebSocketServer | undefined
if (watches) {
  wss = new WebSocketServer({ server })
  wss.on('connection', (ws) => {
    console.log('WebSocket connection established')
  })

  const startWatcher = async () => {
    const watcher = watch(sourceDirectory)
    for await (const event of watcher)
      if (event.eventType === 'change') {
        console.log(`File changed: ${event.filename}`)
        // Broadcast reload to all clients
        wss?.clients.forEach(client => {
          if (client.readyState === 1) { // 1 === OPEN
            client.send('reload')
          }
        })
      }
  }

  console.log('Watching for changes...')
  try {
    startWatcher()
  } catch (err) {
    console.error(`Error watching directory ${sourceDirectory}:`, err)
    throw err
  }

  const builder = spawn('npm', ['run', 'watch'])
  builder.stdout.on('data', (data) => { console.log(` ${data}`) })
  builder.stderr.on('data', (data) => { console.error(` ${data}`) })
  builder.on('close', (code) => { console.log(`Builder process exited with code ${code}`) })
}

server.listen(port, () => {
  console.log(`Serving "${DIRECTORY}" at http://localhost:${port}/`)
})

const o = 1
