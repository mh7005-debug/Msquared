// Local server that mimics the Vercel deployment: static files from /public, functions from /api,
// the rewrites and security headers in vercel.json. Usage: npm run dev  (http://localhost:3000)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
};

function applyHeaders(res, path) {
  for (const rule of vercel.headers) {
    const re = new RegExp('^' + rule.source.replace('(.*)', '.*') + '$');
    if (re.test(path)) for (const h of rule.headers) res.setHeader(h.key, h.value);
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    applyHeaders(res, path);
    try {
      if (path.startsWith('/api/')) {
        const name = path.slice(5).replace(/[^a-z0-9-]/gi, '');
        const file = join(ROOT, 'api', `${name}.js`);
        try {
          await stat(file);
        } catch {
          res.statusCode = 404;
          return res.end('{"error":"Not found"}');
        }
        const mod = await import(pathToFileURL(file).href);
        return await mod.default(req, res);
      }
      const rw = vercel.rewrites.find((r) => r.source === path);
      if (rw) path = rw.destination;
      if (path === '/') path = '/index.html';
      const file = normalize(join(PUBLIC, path));
      if (!file.startsWith(PUBLIC)) {
        res.statusCode = 403;
        return res.end('Forbidden');
      }
      const body = await readFile(file);
      res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
      res.end(body);
    } catch (e) {
      if (!res.headersSent) {
        res.statusCode = e.code === 'ENOENT' ? 404 : 500;
        res.end(e.code === 'ENOENT' ? 'Not found' : 'Server error');
      }
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => {
    console.log(`Msquared running at http://localhost:${port}`);
    console.log(process.env.DATABASE_URL ? 'Storage: Postgres' : 'Storage: in-memory (data resets when the server stops)');
    console.log(process.env.ANTHROPIC_API_KEY ? 'Chat: AI typing enabled' : 'Chat: tap-only (no ANTHROPIC_API_KEY)');
  });
}
