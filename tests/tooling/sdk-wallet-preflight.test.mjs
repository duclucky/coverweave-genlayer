// Current Studio Dev SDK canary; real encoder, offline I/O, no signing or broadcast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';
import { decodeFunctionData } from 'viem';
import { createSdkAdapter } from '../../frontend/src/lib/sdk-adapter.ts';

const sender = '0x1111111111111111111111111111111111111111';
const recipient = '0x2222222222222222222222222222222222222222';
const hash = '0x' + '33'.repeat(32);
const chain = { ...studioDevnet, rpcUrls: { default: { http: ['https://offline-canary.invalid'] } } };
for (const gen of [0n, 1n]) test(`actual RC SDK normalizes account and encodes ${gen} GEN`, async t => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  const sends = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://offline-canary.invalid');
    const { method, id } = JSON.parse(options.body);
    const fixtures = {
      sim_getFeeConfig: { enabled: false, policy: { genPerTimeUnit: '0', storageUnitPrice: '0', receiptGasPrice: '0', timeUnitOverlayBps: '0' } },
      eth_getTransactionCount: '0x0', eth_estimateGas: '0x30d40', eth_gasPrice: '0x0',
      eth_getTransactionReceipt: { transactionHash: hash, transactionIndex: '0x0', blockHash: hash,
        blockNumber: '0x1', from: sender, to: chain.consensusMainContract.address,
        cumulativeGasUsed: '0x0', gasUsed: '0x0', logs: [], logsBloom: '0x' + '00'.repeat(256), status: '0x1', type: '0x0' },
    };
    assert.ok(Object.hasOwn(fixtures, method), 'unexpected offline RPC');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result: fixtures[method] }));
  };
  const provider = { async request(request) {
    assert.equal(request.method, 'eth_sendTransaction');
    sends.push(request.params[0]); return hash;
  }};
  const client = createClient({ chain: { ...chain }, account: sender, provider });
  assert.equal(client.account.address.toLowerCase(), sender);
  assert.equal(await client.writeContract({ address: recipient, functionName: 'fixture', args: [], value: gen * 10n ** 18n }), hash);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].from.toLowerCase(), sender);
  assert.equal(sends[0].to.toLowerCase(), chain.consensusMainContract.address.toLowerCase());
  const call = decodeFunctionData({ abi: chain.consensusMainContract.abi, data: sends[0].data });
  assert.equal(call.functionName, 'addTransaction');
  assert.equal(call.args[0].sender.toLowerCase(), sender);
  assert.equal(call.args[0].recipient.toLowerCase(), recipient);
  assert.equal(call.args[0].userValue, gen * 10n ** 18n);
});
test('project rejects invalid destination; RC SDK rejects missing account before I/O', async t => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Forbidden I/O'); };
  const provider = { async request() { calls++; throw new Error('Forbidden wallet request'); } };
  for (const contractAddress of [undefined, 'undefined', '0x0000000000000000000000000000000000000000']) {
    const adapter = createSdkAdapter({ contractAddress, origin: 'https://offline-canary.invalid' });
    await assert.rejects(adapter.transact({ method: 'review_bundle', id: 'fixture' },
      { address: sender, provider }, () => {}), /missing or invalid/);
  }
  const disconnected = createClient({ chain: { ...chain }, provider });
  await assert.rejects(disconnected.writeContract({ address: recipient, functionName: 'fixture', args: [] }), /No account set/);
  assert.equal(calls, 0);
});
