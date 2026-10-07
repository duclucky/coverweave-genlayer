// Actual project adapter and actual SDK; only I/O is intercepted. No live chain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abi } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';
import { decodeFunctionData, toHex, fromRlp } from 'viem';
import { createSdkAdapter } from '../src/lib/sdk-adapter.ts';
import { prepareStudioWallet } from '../src/lib/network.ts';
import { projectRpcResult } from '../../shared/rpc-proxy.ts';

const sender = '0x1111111111111111111111111111111111111111';
const recipient = '0x2222222222222222222222222222222222222222';
const a = '0x3333333333333333333333333333333333333333';
const b = '0x4444444444444444444444444444444444444444';
const hash = `0x${'55'.repeat(32)}`;
const chainId = `0x${studioDevnet.id.toString(16)}`;
const config = { contractAddress: recipient, icRpc: '/api/ic', origin: 'https://offline-adapter.invalid', pollIntervalMs: 1, maxPolls: 2 };

test('missing and invalid configuration fails before I/O', async () => {
  const adapter = createSdkAdapter({ ...config, contractAddress: '' });
  assert.equal(adapter.ready, false);
  assert.match(adapter.unavailableReason, /VITE_CONTRACT_ADDRESS/);
  assert.equal(createSdkAdapter({ ...config, contractAddress: 'undefined' }).ready, false);
});

test('chain switch/add uses selected provider and verifies its account', async () => {
  const calls = [];
  let current = '0x1';
  const provider = { async request(request) {
    calls.push(request);
    if (request.method === 'eth_chainId') return current;
    if (request.method === 'eth_accounts') return [sender];
    if (request.method === 'wallet_switchEthereumChain') {
      if (calls.filter(x => x.method === request.method).length === 1) throw { code: 4902 };
      current = chainId; return null;
    }
    if (request.method === 'wallet_addEthereumChain') return null;
    throw new Error('Unexpected wallet request');
  }};
  await prepareStudioWallet({ address: sender, provider });
  const add = calls.find(x => x.method === 'wallet_addEthereumChain');
  assert.equal(add.params[0].chainId, chainId);
  assert.deepEqual(add.params[0].rpcUrls, studioDevnet.rpcUrls.default.http);
  assert.equal(add.params[0].nativeCurrency.symbol, 'GEN');
  assert.ok(!calls.some(x => x.method === 'eth_requestAccounts'));
});

test('real SDK encodes project writes through selected wallet and separates finality', async (t) => {
  const originalFetch = globalThis.fetch;
  const sends = [];
  const requests = [];
  let sequence = 0;
  const provider = { async request(request) {
    if (request.method === 'eth_chainId') return chainId;
    if (request.method === 'eth_accounts') return [sender];
    if (request.method === 'eth_sendTransaction') { sends.push(request.params[0]); return hash; }
    throw new Error('Unexpected selected-wallet method: ' + request.method);
  }};
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://offline-adapter.invalid/api/ic');
    const request = JSON.parse(options.body);
    requests.push(request);
    let result;
    switch (request.method) {
      case 'eth_chainId': result = chainId; break;
      case 'sim_getFeeConfig': result = { enabled: true, policy: { genPerTimeUnit: '1', storageUnitPrice: '1', receiptGasPrice: '1', timeUnitOverlayBps: '0' } }; break;
      case 'sim_estimateTransactionFees': result = { recommendedPreset: { distribution: { leaderTimeunitsAllocation:'100', validatorTimeunitsAllocation:'200', appealRounds:'0', executionBudgetPerRound:'250000000000000', executionConsumed:'0', totalMessageFees:'0', rotations:['3'], maxPriceGenPerTimeUnit:'2', storageFeeMaxGasPrice:'2', receiptFeeMaxGasPrice:'2' }, feeValue:'1000000000000000', messageAllocations:[] } }; break;
      case 'eth_getTransactionCount': result = '0x0'; break;
      case 'eth_estimateGas': result = '0x30d40'; break;
      case 'eth_gasPrice': result = '0x0'; break;
      case 'eth_getTransactionReceipt': result = { transactionHash: hash, transactionIndex: '0x0', blockHash: hash, blockNumber: '0x1', from: sender, to: studioDevnet.consensusMainContract.address, cumulativeGasUsed: '0x0', gasUsed: '0x0', logs: [], logsBloom: '0x' + '00'.repeat(256), status: '0x1', type: '0x0' }; break;
      case 'eth_getTransactionByHash': result = { hash, from: sender, to: recipient, status: sequence++ % 2 === 0 ? 'ACCEPTED' : 'FINALIZED', result: 1, data: {}, consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } }; break;
      default: throw new Error('Unexpected offline SDK RPC: ' + request.method);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: projectRpcResult(request.method, result) }), { headers: { 'content-type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const adapter = createSdkAdapter(config);
  assert.equal(adapter.ready, true);
  const commands = [
    { method: 'open_bundle', input: { id: 'offline', goal: 'Read and export', issuerA: a, issuerB: b, offerDeadline: 1800000000, reviewDeadline: 1800001000, useDeadline: 1800002000 } },
    { method: 'offer_grant', id: 'offline', terms: 'Permission to read' },
    { method: 'ratify_bundle', id: 'offline', digest: '66'.repeat(32) },
    ...['review_bundle', 'refund_expired', 'consume_permit', 'expire_permit', 'withdraw_credit', 'close_bundle'].map(method => ({ method, id: 'offline' })),
  ];
  for (const command of commands) {
    const stages = [];
    await adapter.transact(command, { address: sender, provider }, state => stages.push(state.stage));
    assert.deepEqual(stages, ['awaiting-signature', 'submitted', 'accepted', 'finalized']);
    const send = sends.at(-1);
    assert.equal(send.from.toLowerCase(), sender);
    assert.equal(send.to.toLowerCase(), studioDevnet.consensusMainContract.address.toLowerCase());
    const decoded = decodeFunctionData({ abi: studioDevnet.consensusMainContract.abi, data: send.data });
    assert.equal(decoded.functionName, 'addTransaction');
    const input = decoded.args.length === 1 ? decoded.args[0] : null;
    assert.ok(input, 'current fee-aware ABI tuple expected');
    assert.equal(input.sender.toLowerCase(), sender);
    assert.equal(input.recipient.toLowerCase(), recipient);
    assert.equal(input.userValue, command.method === 'open_bundle' ? 2n * 10n ** 18n : 0n);
    assert.equal(BigInt(send.value), input.userValue + 1000000000000000n, 'measured fees must fund the signed EVM envelope');
    const wire = fromRlp(input.txCalldata, 'bytes');
    const call = abi.calldata.decode(wire[0]);
    assert.equal(call.get(''), command.method);
    if (command.method === 'open_bundle') {
      assert.equal(toHex(call.get('args')[2].bytes).toLowerCase(), a);
      assert.equal(toHex(call.get('args')[3].bytes).toLowerCase(), b);
    }
  }
  assert.equal(sends.length, 9);
  assert.ok(!requests.some(x => x.method === 'eth_sendTransaction'));
});

test('changed account and rejected chain switch stop before a wallet broadcast', async () => {
  const adapter = createSdkAdapter(config);
  const command = { method: 'review_bundle', id: 'offline' };
  let sends = 0;
  const accountChanged = { async request(request) {
    if (request.method === 'eth_chainId') return chainId;
    if (request.method === 'eth_accounts') return [a];
    if (request.method === 'eth_sendTransaction') sends++;
    throw new Error('Unexpected wallet call');
  }};
  await assert.rejects(adapter.transact(command, { address: sender, provider: accountChanged }, () => {}), /account changed/);
  const switchDeclined = { async request(request) {
    if (request.method === 'eth_chainId') return '0x1';
    throw { code: 4001 };
  }};
  await assert.rejects(adapter.transact(command, { address: sender, provider: switchDeclined }, () => {}), /Switch your selected wallet/);
  assert.equal(sends, 0);
});

test('pending reference blocks a duplicate write and resumes using reads only', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let completed = false;
  let sends = 0;
  const provider = { async request(request) {
    if (request.method === 'eth_chainId') return chainId;
    if (request.method === 'eth_accounts') return [sender];
    if (request.method === 'eth_sendTransaction') { sends++; return hash; }
    throw new Error('Unexpected wallet call');
  }};
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    let result;
    const fixtures = { eth_getTransactionCount: '0x0', eth_estimateGas: '0x30d40', eth_gasPrice: '0x0',
      sim_getFeeConfig: { enabled: false, policy: { genPerTimeUnit: '0', storageUnitPrice: '0', receiptGasPrice: '0', timeUnitOverlayBps: '0' } },
      sim_estimateTransactionFees: { recommendedPreset: { distribution: { rotations:['3'] }, feeValue:'0', messageAllocations:[] } },
      eth_getTransactionReceipt: { transactionHash: hash, transactionIndex: '0x0', blockHash: hash,
        blockNumber: '0x1', from: sender, to: studioDevnet.consensusMainContract.address,
        cumulativeGasUsed: '0x0', gasUsed: '0x0', logs: [], logsBloom: '0x' + '00'.repeat(256), status: '0x1', type: '0x0' } };
    if (request.method === 'eth_getTransactionByHash') result = { hash, status: completed ? 'FINALIZED' : 'ACCEPTED',
      result: 1, consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } };
    else result = fixtures[request.method];
    assert.ok(result, 'bounded offline I/O fixture');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: projectRpcResult(request.method, result) }));
  };
  const adapter = createSdkAdapter(config);
  const wallet = { address: sender, provider };
  const command = { method: 'review_bundle', id: 'offline' };
  const states = [];
  await assert.rejects(adapter.transact(command, wallet, s => states.push(s.stage)), e => e.name === 'PendingTransactionError' && e.hash === hash);
  assert.equal(states.at(-1), 'timeout');
  await assert.rejects(adapter.transact(command, wallet, () => {}), e => e.name === 'PendingTransactionError');
  completed = true;
  await adapter.resumeTransaction(wallet, hash, s => states.push(s.stage));
  assert.equal(states.at(-1), 'finalized');
  assert.equal(sends, 1);
});

test('actual SDK reads finalized canonical views, maps roles and all recovery state', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://offline-adapter.invalid/api/ic');
    const request = JSON.parse(options.body);
    assert.equal(request.method, 'gen_call');
    assert.equal(request.params[0].transaction_hash_variant, 'latest-final');
    const call = abi.calldata.decode(fromRlp(request.params[0].data, 'bytes')[0]);
    const method = call.get('');
    const args = call.get('args') ?? [];
    calls.push(method);
    let value;
    if (method === 'list_bundle_ids') value = args[0] === 0n ? ['canonical'] : [];
    if (method === 'get_bundle') value = { id: 'canonical', buyer: sender, issuer_a: a, issuer_b: b,
      goal: 'Read and export', status: 'PURCHASED', permit: 'AVAILABLE', definition_digest: '66'.repeat(32), assents: 7,
      offer_deadline: 1800000000, review_deadline: 1800001000, use_deadline: 1800002000, attempt_count: 1, purchase_gen: '2' };
    if (method === 'get_grant') value = { slot: args[1], issuer: args[1] === 'A' ? a : b,
      terms: args[1] === 'A' ? 'Permission to read' : 'Permission to export', definition_digest: '66'.repeat(32) };
    if (method === 'get_credit') {
      const owner = toHex(args[1].bytes);
      value = { bundle_id: 'canonical', owner, credit_gen: owner === sender ? '0' : '1' };
    }
    if (method === 'get_attempt') value = { index: 0, classes: ['INCOMPLETE', 'INCOMPLETE', 'COMPLETE'],
      context_ok: true, definition_digest: '66'.repeat(32), outcome: 'PURCHASED', reviewed_at: 1800000500 };
    assert.ok(value, 'only expected project views');
    const result = toHex(abi.calldata.encode(JSON.stringify(value)));
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }), { headers: { 'content-type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const adapter = createSdkAdapter(config);
  const bundle = await adapter.getBundle('canonical');
  assert.equal(bundle.state, 'PURCHASED');
  assert.deepEqual(bundle.grants.map(g => g.assented), [true, true]);
  assert.equal(bundle.buyerAssented, true);
  assert.deepEqual(bundle.credits, { [sender]: '0', [a]: '1', [b]: '1' });
  assert.equal(bundle.attempts[0].state, 'PURCHASED');
  assert.deepEqual((await adapter.listBundles()).map(x => x.id), ['canonical']);
  assert.ok(calls.includes('get_attempt'));
});

test('reverted wallet envelope is failed immediately on read-only resume, never indefinitely pending', async (t) => {
 const originalFetch=globalThis.fetch;t.after(()=>{globalThis.fetch=originalFetch;});
 let writes=0,reads=0;
 const provider={async request(r){if(r.method==='eth_chainId')return chainId;if(r.method==='eth_accounts')return[sender];writes++;throw Error('No write allowed');}};
 globalThis.fetch=async(_url,options)=>{
  const r=JSON.parse(options.body);reads++;
  const result=r.method==='eth_getTransactionReceipt'?{status:'0x0',transactionHash:hash}: {hash,from:sender,to:studioDevnet.consensusMainContract.address};
  return new Response(JSON.stringify({jsonrpc:'2.0',id:r.id,result:projectRpcResult(r.method,result)}));
 };
 const states=[];
 await assert.rejects(createSdkAdapter(config).resumeTransaction({address:sender,provider},hash,s=>states.push(s.stage)),/wallet transaction reverted/i);
 assert.deepEqual(states,['failed']);assert.equal(writes,0);assert.ok(reads<=2);
});
