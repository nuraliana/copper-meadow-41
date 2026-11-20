// A small file server for trying the guide on this machine: `node serve.ts`
// puts app/ on http://localhost:8080 (pass --port <n> for another port). It
// answers only with files under app/, sends the content type each kind of
// file needs, and never reaches the network. This is a local convenience for
// development and screenshots, not a server for the open internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const cliArgs = process.argv.slice(2);
const portFlag = cliArgs.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(cliArgs[portFlag + 1]);
const listenPort = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer((req, res) => {
  const parsed = new URL(req.url ?? '/', 'http://localhost');
  let pathPart: string;
  try {
    pathPart = decodeURIComponent(parsed.pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (pathPart.endsWith('/')) pathPart += 'index.html';
  const target = resolve(join(appRoot, normalize(pathPart)));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let byteSize: number;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('not a file');
    byteSize = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': byteSize,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
}).listen(listenPort, '127.0.0.1', () => {
  console.log(`guide is on http://localhost:${listenPort}`);
});
