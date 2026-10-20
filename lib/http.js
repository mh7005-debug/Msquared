import { timingSafeEqual, createHash } from 'node:crypto';

const MAX_BODY = 32 * 1024;

/** Reads a JSON body. Works with Vercel's pre-parsed req.body and with a raw Node stream. */
export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    const s = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    return s ? JSON.parse(s) : {};
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Request too large');
    chunks.push(c);
  }
  const s = Buffer.concat(chunks).toString('utf8');
  return s ? JSON.parse(s) : {};
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function sendText(res, status, text, contentType = 'text/plain; charset=utf-8', extra = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(text);
}

/** Wraps a handler: method check, JSON errors, no stack traces or user data in logs. */
export function handler(methods, fn) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        return sendJson(res, 405, { error: 'Method not allowed' });
      }
      await fn(req, res);
    } catch (e) {
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
      if (e instanceof SyntaxError) return sendJson(res, 400, { error: 'Invalid JSON' });
      console.error('[msquared] server error:', e && e.name, e && e.code);
      return sendJson(res, 500, { error: 'Something went wrong. Try again.' });
    }
  };
}

export function getQuery(req) {
  return new URL(req.url, 'http://local').searchParams;
}

function sha(s) {
  return createHash('sha256').update(String(s)).digest();
}

/**
 * Researcher auth for export/delete. Accepts HTTP Basic (any username, password = EXPORT_PASSWORD)
 * or "Authorization: Bearer <EXPORT_PASSWORD>". Disabled entirely unless a strong password is set.
 */
export function requireResearcher(req, res) {
  const secret = process.env.EXPORT_PASSWORD || '';
  if (secret.length < 12) {
    sendJson(res, 503, { error: 'Export is disabled until EXPORT_PASSWORD (12+ characters) is set.' });
    return false;
  }
  const h = req.headers['authorization'] || '';
  let given = null;
  if (h.startsWith('Bearer ')) given = h.slice(7);
  else if (h.startsWith('Basic ')) {
    const decoded = Buffer.from(h.slice(6), 'base64').toString('utf8');
    given = decoded.includes(':') ? decoded.slice(decoded.indexOf(':') + 1) : decoded;
  }
  if (given !== null && timingSafeEqual(sha(given), sha(secret))) return true;
  res.setHeader('WWW-Authenticate', 'Basic realm="Msquared research export", charset="UTF-8"');
  sendJson(res, 401, { error: 'Authorization required' });
  return false;
}
