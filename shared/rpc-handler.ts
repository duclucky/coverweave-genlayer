import type { IncomingMessage, ServerResponse } from 'node:http';
import { forwardRpc } from './rpc-proxy.ts';

export async function rpcHandler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; res.end('{"error":"POST required"}'); return; }
  let body: unknown = req.body;
  try {
    if (body === undefined) {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 65536) { res.statusCode = 413; res.end('{"error":"Request too large"}'); return; }
        chunks.push(buffer);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } else if (typeof body === 'string') body = JSON.parse(body);
    res.end(JSON.stringify(await forwardRpc(body)));
  } catch { res.statusCode = 400; res.end('{"error":"Invalid JSON request"}'); }
}
