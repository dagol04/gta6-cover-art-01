// A tiny static server for app/ (Node 22, standard library only), so the entry
// can be tried locally with no build step: `node serve.ts` serves app/ on
// http://localhost:8080 (or --port <n>). It sends the MIME types an offline web
// app needs and refuses any path outside app/. Development convenience only.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const cliArgs = process.argv.slice(2);
const portFlagAt = cliArgs.indexOf('--port');
const askedPort = portFlagAt === -1 ? 8080 : Number(cliArgs[portFlagAt + 1]);
const listenPort = Number.isInteger(askedPort) && askedPort > 0 && askedPort < 65536
  ? askedPort
  : 8080;

const MEDIA_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

/** Resolves a request path to a file inside app/, or null when it escapes. */
function resolveInsideApp(pathname) {
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(appRoot, normalize(pathname)));
  if (file !== appRoot && !file.startsWith(appRoot + sep)) return null;
  return file;
}

/** Sends one file from app/ with its MIME type, or a 404 when it is missing. */
function serveFile(file, request, response) {
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': MEDIA_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
}

/** Handles one request: only GET and HEAD, only files inside app/. */
function handleRequest(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'allow': 'GET, HEAD' }).end('method not allowed');
    return;
  }
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const file = resolveInsideApp(pathname);
  if (!file) {
    response.writeHead(403).end('forbidden');
    return;
  }
  serveFile(file, request, response);
}

createServer(handleRequest).listen(listenPort, '127.0.0.1', () => {
  console.log(`Sunset Cover Studio is on http://localhost:${listenPort} — open it in desktop Chrome`);
});
