import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

test('compiled production entry loads shared modules and preserves public read boundary', async () => {
  // Compiled handler now uses the same installed SDK as production. Keep the
  // isolated output beneath the project so Node resolves its pinned packages.
  const tempParent = resolve('reports');
  await mkdir(tempParent, {recursive:true});
  const root = await mkdtemp(resolve(tempParent, 'coverweave-rpc-'));
  const originalFetch = globalThis.fetch;
  try {
    await writeFile(resolve(root, 'package.json'), '{"type":"module"}');
    for (const source of ['frontend/api/ic.ts', 'shared/rpc-handler.ts', 'shared/rpc-proxy.ts']) {
      const file = resolve(root, source.replace(/\.ts$/, '.js'));
      await mkdir(dirname(file), { recursive: true });
      const compiled = ts.transpileModule(await readFile(source, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      await writeFile(file, compiled);
    }
    const { default: handler } = await import(pathToFileURL(resolve(root, 'frontend/api/ic.js')).href);
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://studio-next.genlayer.com/api');
      assert.equal(JSON.parse(options.body).method, 'eth_chainId');
      return new Response(JSON.stringify({ result: '0xf22d' }));
    };
    let response;
    const res = { setHeader() {}, end(value) { response = JSON.parse(value); } };
    await handler({ method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] } }, res);
    assert.equal(response.result, '0xf22d');
    await handler({ method: 'POST', body: { jsonrpc: '2.0', id: 2, method: 'eth_sendRawTransaction', params: ['blocked'] } }, res);
    assert.ok(response.error);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (!root.startsWith(tempParent + sep + 'coverweave-rpc-')) throw new Error('Unexpected temporary cleanup target.');
    await rm(root, { recursive: true, force: true });
  }
});
