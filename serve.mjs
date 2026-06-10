import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  const baseHeaders = {
    'Cache-Control': 'no-store',
    ...headers,
  };
  res.writeHead(status, baseHeaders);
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let filePath = path.join(root, decodeURIComponent(url.pathname));

    if (url.pathname === '/' || url.pathname === '') {
      filePath = path.join(root, 'index.html');
    }

    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const data = await fs.readFile(filePath);
    const cacheHeader = ext === '.html'
      ? 'no-store'
      : 'public, max-age=3600';

    send(res, 200, data, {
      'Cache-Control': cacheHeader,
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    });
  } catch (error) {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview server running at http://127.0.0.1:${port}`);
});
