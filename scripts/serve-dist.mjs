import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const portFlagIndex = process.argv.indexOf('--port');
const port = portFlagIndex >= 0 ? Number(process.argv[portFlagIndex + 1]) : 4173;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const getFilePath = (url) => {
  const pathname = new URL(url, `http://127.0.0.1:${port}`).pathname;
  const cleanPath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  return join(distDir, cleanPath === '/' ? 'index.html' : cleanPath);
};

const server = createServer(async (req, res) => {
  try {
    const filePath = getFilePath(req.url || '/');
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const data = await readFile(join(distDir, 'index.html'));
      res.writeHead(200, { 'content-type': mimeTypes['.html'] });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving dist at http://127.0.0.1:${port}`);
});
