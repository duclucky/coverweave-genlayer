import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedRpcMethod, projectRpcResult, forwardRpc } from '../../shared/rpc-proxy.ts';
import { abi } from 'genlayer-js';

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

test('write fee simulation returns only an SDK fee preset, never receipt or validator secrets', async () => {
 const marker='fixture-private-material';
 const projected=projectRpcResult('sim_estimateTransactionFees',{receipt:{node_config:marker},recommendedPreset:{distribution:{executionBudgetPerRound:'1',rotations:[3],private:marker},feeValue:'4',messageAllocations:[],observed:{private:marker}}});
 assert.equal(projected.recommendedPreset.feeValue,'4');
 assert.ok(!JSON.stringify(projected).includes(marker));
 const data=abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject('review_bundle',['bound'])),false]);
 const input={jsonrpc:'2.0',id:1,method:'sim_estimateTransactionFees',params:[{type:'write',from:'0x1111111111111111111111111111111111111111',to:'0xe4F0378799b47e7AE05F64d93dFE6590F68C5833',data,sim_config:{genvm_datetime:'1900-01-01',mock:marker}}]};
 let calls=0;
 const result=await forwardRpc(input,async (_url, options)=>{
  const r=JSON.parse(options.body);calls++;
  if(r.method==='eth_getBlockByNumber')return new Response(JSON.stringify({result:{timestamp:'0x6ac50efc'}}));
  assert.equal(r.method,'sim_estimateTransactionFees');
  assert.equal(r.params[0].to,'0xe4F0378799b47e7AE05F64d93dFE6590F68C5833','Studio profiler requires the canonical checksum spelling');
  assert.deepEqual(r.params[0].sim_config,{genvm_datetime:'2026-10-06T15:08:44.000Z'});
  assert.equal(r.params[0].transaction_hash_variant,'latest-final');
  return new Response(JSON.stringify({result:{recommendedPreset:{distribution:{rotations:[3]},feeValue:'4',messageAllocations:[]}}}));
 });
 assert.equal(result.result.recommendedPreset.feeValue,'4');assert.equal(calls,2);
 for(const changes of [{to:'0x2222222222222222222222222222222222222222'},{type:'read'},{value:'0x1'},{data:'0x00'}]){
  const rejected=await forwardRpc({...input,params:[{...input.params[0],...changes}]},async()=>{throw Error('Must reject before I/O');});
  assert.ok(rejected.error);
 }
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
