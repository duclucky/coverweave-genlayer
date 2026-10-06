import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedRpcMethod, projectRpcResult, forwardRpc } from '../../shared/rpc-proxy.ts';

test('actual Studio gen_call bare hex is preserved for SDK decoding, never arbitrary data', () => {
  assert.equal(projectRpcResult('gen_call', 'cc227b22'), 'cc227b22');
  assert.equal(projectRpcResult('gen_call', '0xcc227b22'), '0xcc227b22');
  for (const invalid of ['private log', 'abc', { node_config: 'private' }])
    assert.throws(() => projectRpcResult('gen_call', invalid));
  assert.throws(() => projectRpcResult('eth_chainId', 'cc227b22'));
});

test('proxy accepts necessary reads and refuses broadcast, signatures and admin mocks', () => {
  for (const method of ['eth_chainId', 'gen_call', 'eth_getTransactionByHash', 'eth_estimateGas', 'sim_getFeeConfig']) assert.equal(allowedRpcMethod(method), true);
  for (const method of ['eth_sendTransaction', 'eth_sendRawTransaction', 'eth_signTransaction', 'personal_sign', 'sim_installMocks', 'sim_fundAccount']) assert.equal(allowedRpcMethod(method), false);
});
test('private validator config, logs, trace and calldata cannot reach browser receipt', () => {
  const privateMarker = 'fixture-private-material';
  const raw = { hash: '0x' + 'aa'.repeat(32), status: 'FINALIZED', result: 1,
    node_config: { secret: privateMarker }, data: { calldata: privateMarker },
    consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS', node_config: { key: privateMarker },
      genvm_result: { stdout: privateMarker, stderr: privateMarker }, result: privateMarker }],
      validators: [{ node_config: { key: privateMarker } }] }, trace: privateMarker };
  const projected = projectRpcResult('eth_getTransactionByHash', raw);
  assert.equal(projected.status, 'FINALIZED');
  assert.equal(projected.consensus_data.leader_receipt[0].execution_result, 'SUCCESS');
  assert.ok(!JSON.stringify(projected).includes(privateMarker));
});
test('RPC fee config projection retains required public policy fields only', () => {
  const projected = projectRpcResult('sim_getFeeConfig', { enabled: true,
    policy: { genPerTimeUnit: '1', storageUnitPrice: '2', receiptGasPrice: '3', timeUnitOverlayBps: '0', private: 'remove' },
    provider_config: { private: 'remove' } });
  assert.equal(projected.policy.genPerTimeUnit, '1');
  assert.ok(!JSON.stringify(projected).includes('remove'));
});

test('single-object leader receipt is projected as safely as an array', () => {
  const projected = projectRpcResult('eth_getTransactionByHash', { status: 'FINALIZED',
    consensus_data: { leader_receipt: { execution_result: 'SUCCESS', node_config: 'remove' } } });
  assert.equal(projected.consensus_data.leader_receipt[0].execution_result, 'SUCCESS');
  assert.ok(!JSON.stringify(projected).includes('remove'));
});

test('proxy fixes upstream, rejects write-like calls, and never relays private errors', async () => {
  let calls = 0;
  const request = async (url, options) => {
    calls++;
    assert.equal(url, 'https://studio-next.genlayer.com/api');
    assert.equal(JSON.parse(options.body).method, 'eth_chainId');
    return new Response(JSON.stringify({ result: '0xf22d' }));
  };
  assert.equal((await forwardRpc({ jsonrpc: '2.0', id: 7, method: 'eth_chainId', params: [] }, request)).result, '0xf22d');
  for (const body of [[], { jsonrpc: '2.0', method: 'eth_sendTransaction', params: [] },
    { jsonrpc: '2.0', method: 'gen_call', params: [{ type: 'write' }] }])
    assert.ok((await forwardRpc(body, request)).error);
  assert.equal(calls, 1);
  const response = await forwardRpc({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
    async () => new Response(JSON.stringify({ error: { code: -1, message: 'fixture-secret', data: { node_config: 'fixture-secret' } } })));
  assert.ok(!JSON.stringify(response).includes('fixture-secret'));
});
