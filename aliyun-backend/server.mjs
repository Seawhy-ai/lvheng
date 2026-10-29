import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import worker from '../fastgpt-worker/worker.js';
import { openDatabase } from './database.mjs';

export function createBackend(env) {
  return createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://seawhy-ai.github.io').split(',').map(s => s.trim());
    const send = (status, error) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...(allowed.includes(origin) ? {'access-control-allow-origin':origin, vary:'Origin'} : {}) });
      res.end(JSON.stringify({error}));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (origin && !allowed.includes(origin)) return send(403, 'Origin not allowed');
      // Legacy public chat can spend API credits without classroom authentication.
      if (url.pathname === '/api/chat') return send(403, '请使用登录后的学习搭子入口');
      if (url.pathname === '/healthz' && req.method === 'GET') {
        await env.DB.prepare('SELECT 1 ok').first();
        res.writeHead(200, {'content-type':'application/json','cache-control':'no-store'});res.end('{"ok":true}');return;
      }
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 128 * 1024) { send(413, 'Request too large'); return; }
        chunks.push(chunk);
      }
      const request = new Request(url, { method: req.method, headers: req.headers,
        ...(!['GET','HEAD'].includes(req.method) && size ? { body: Buffer.concat(chunks) } : {}) });
      const response = await worker.fetch(request, env);
      if (response.status >= 500) return send(503, '服务暂时不可用，请稍后重试');
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { if (!res.headersSent) send(500, 'Internal server error'); else res.end(); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.DB_PATH) throw new Error('DB_PATH is required');
  const DB = openDatabase(process.env.DB_PATH);
  const server = createBackend({...process.env, DB});
  server.requestTimeout = 30000;
  server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('律衡 backend listening on loopback'));
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => {
    server.close(() => { DB.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
