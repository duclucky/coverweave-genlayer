// Resumable Studio Dev only. No funding, raw receipt logging or key exports.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { abi } from 'genlayer-js';
import { TransactionHashVariant } from 'genlayer-js/types';
import { formatUnits, keccak256, hexToBytes, parseUnits } from 'viem';
import { CalldataAddress } from 'genlayer-js/types';
import { authorizedAccounts, studioClient, projectRoot, icRpc, explorer } from './studio-config.mjs';
import { readJournal, saveJournal, recordBroadcast } from './studio-journal.mjs';
import { receiptState, assertFinalizedSuccess } from './receipt.mjs';

const mode = process.argv[2] || 'inspect';
if (!['inspect', 'deploy', 'lifecycle'].includes(mode)) throw new Error('Use inspect, deploy or lifecycle.');
const source = readFileSync(resolve(projectRoot, 'contracts/coverweave.py'), 'utf8');
const runner = JSON.parse(source.split(/\r?\n/)[1].slice(2)).Depends;
const commit = execFileSync('git', ['log', '-1', '--format=%H', '--', 'contracts/coverweave.py'], { cwd: projectRoot, encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Commit reviewed source before deployment.');
const committedSource = execFileSync('git', ['show', commit + ':contracts/coverweave.py'], { cwd: projectRoot, encoding: 'utf8' });
if (committedSource.replace(/\r\n/g, '\n') !== source.replace(/\r\n/g, '\n')) throw new Error('Contract differs from bound source commit.');
const identity = { project: 'coverweave', network: 'studio-dev', chainId: 61997,
  icRpc, explorer, sourceCommit: commit, sourceSha256: createHash('sha256').update(source).digest('hex'),
  runner, apiVersion: 'v0.3.0', sdk: 'genlayer-js@2.0.0-rc.1' };
const journalPath = resolve(projectRoot, 'docs/evidence/studio-dev/deployment.json');
const journal = readJournal(journalPath, identity);
const accounts = authorizedAccounts();
const read = studioClient();
const save = () => saveJournal(journalPath, journal);
let broadcasting = null;
const originalFetch = globalThis.fetch;
// The SDK's error logger must never receive upstream private error data.
globalThis.fetch = async (url, options) => {
  if (String(url) !== icRpc) throw new Error('Unexpected deployment RPC destination.');
  const request = JSON.parse(options.body);
  if (request.method === 'eth_sendRawTransaction') {
    if (!broadcasting) throw new Error('Broadcast has no active journal step.');
    const hash = keccak256(request.params[0]);
    recordBroadcast(journal, broadcasting.key, broadcasting.actor, hash);
    journal.steps[broadcasting.key].explorerURL = explorer + '/tx/' + hash;
    save(); // Persist before the network call, including an ambiguous timeout.
    console.log(JSON.stringify({ step: broadcasting.key, stage: 'submitted', hash }));
  }
  const response = await originalFetch(url, { ...options, signal: AbortSignal.timeout(55000) });
  const data = await response.json();
  if (data.error) return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id,
    error: { code: Number.isInteger(data.error.code) ? data.error.code : -32000, message: 'Studio Dev RPC rejected this operation.' } }),
    { status: response.status, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify(data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
};

async function view(method, args = []) {
  if (!journal.contractAddress) throw new Error('No verified deployment address.');
  const value = await read.readContract({ address: journal.contractAddress, functionName: method,
    args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
  if (typeof value !== 'string') throw new Error('Canonical view did not return JSON text.');
  return JSON.parse(value);
}
async function balance(address) {
  return BigInt(await read.request({ method: 'eth_getBalance', params: [address, 'latest'] }));
}
async function snapshot(id) {
  const result = { accounting: await view('get_accounting', [id]), contractBalanceGEN: formatUnits(await balance(journal.contractAddress), 18) };
  if (result.accounting.exists) result.bundle = await view('get_bundle', [id]);
  return result;
}
async function wait(hash, step) {
  let last = '';
  for (let i = 0; i < 180; i++) {
    let receipt;
    try { receipt = await read.request({ method: 'eth_getTransactionByHash', params: [hash] }); }
    catch { await new Promise(r => setTimeout(r, 5000)); continue; }
    if (!receipt) { await new Promise(r => setTimeout(r, 5000)); continue; }
    const state = receiptState(receipt);
    const status = typeof receipt.status === 'string' ? receipt.status : 'UNKNOWN';
    if (last !== status) {
      console.log(JSON.stringify({ step, status, execution: state.execution, hash })); last = status;
    }
    if (['CANCELED', 'UNDETERMINED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'].includes(status) || state.execution === 'ERROR') {
      journal.steps[step].status = status;
      journal.steps[step].execution = state.execution;
      journal.steps[step].lastObservedUTC = new Date().toISOString(); save();
      throw new Error('Recorded transaction is unsuccessful; inspect without replay.');
    }
    if (state.finalized) {
      assertFinalizedSuccess(receipt);
      Object.assign(journal.steps[step], { status: 'FINALIZED', execution: 'SUCCESS',
        finalityObservedUTC: new Date().toISOString(),
        // Observation time is never represented as a network finalization timestamp.
        networkFinalizedAt: typeof receipt.finalized_at === 'string' ? receipt.finalized_at : null });
      save(); return receipt;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Recorded transaction confirmation pending; rerun to read this reference only.');
}
async function step(key, role, submit, quote, before) {
  const existing = journal.steps[key];
  if (!existing?.hash) {
    if (quote.feeValue > 10n ** 18n) throw new Error('Quoted fee exceeds the 1-GEN operation cap.');
    journal.steps[key] = { actor: accounts[role].address, feeQuoteGEN: formatUnits(quote.feeValue, 18),
      before, status: 'PREPARED' }; save();
    broadcasting = { key, actor: accounts[role].address };
    try { await submit(); } finally { broadcasting = null; }
  }
  const hash = journal.steps[key]?.hash;
  if (!hash) throw new Error('No saved broadcast reference; no success claimed.');
  return wait(hash, key);
}
async function deploy() {
  if (!journal.steps.deploy?.hash) {
    const client = studioClient(accounts.buyer);
    const data = abi.transactions.serialize([source, abi.calldata.encode(abi.calldata.makeCalldataObject(undefined, [])), false]);
    const baseline = await client.estimateTransactionFees();
    const simulationFees = JSON.parse(JSON.stringify({ distribution: baseline.distribution,
      feeValue: baseline.feeValue, messageAllocations: [] }, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
    const simulation = await client.request({ method: 'sim_call', params: [{ type: 'deploy',
      from: accounts.buyer.address, to: '0x0000000000000000000000000000000000000000', data, fees: simulationFees }] });
    if (simulation?.execution_result !== 'SUCCESS') throw new Error('Bounded deployment simulation did not execute successfully.');
    if (!simulation?.genvm_result?.fee_accounting) throw new Error('Deployment simulation did not provide measured fee accounting.');
    const quote = await client.estimateTransactionFeesFromSimulation({ simulation: { receipt: simulation } });
    await step('deploy', 'buyer', () => client.deployContract({ code: source, args: [],
      fees: { distribution: quote.distribution, feeValue: quote.feeValue, messageAllocations: quote.messageAllocations } }), quote,
      { simulationExecution: 'SUCCESS', userValueGEN: '0' });
  }
  const receipt = await wait(journal.steps.deploy.hash, 'deploy');
  const address = receipt.data?.contract_address ?? receipt.data?.contractAddress;
  if (typeof address !== 'string' || !/^0x[0-9a-f]{40}$/i.test(address) || /^0x0{40}$/i.test(address))
    throw new Error('Finalized deployment address is not proved.');
  if (journal.contractAddress && journal.contractAddress.toLowerCase() !== address.toLowerCase()) throw new Error('Deployment address changed.');
  journal.contractAddress = address; journal.status = 'ACTIVE'; save();
  const schema = await read.request({ method: 'gen_getContractSchema', params: [address] });
  if (!schema?.ctor || !schema?.methods || Object.keys(schema.methods).length !== 17) throw new Error('Deployed schema does not match 17 methods.');
  const onchain = await read.getContractCode(address);
  if (onchain !== source) throw new Error('Deployed source parity is not proved.');
  journal.sourceParityVerified = true;
  journal.schemaMethodCount = 17;
  journal.initialAccounting = await view('get_global_accounting'); save();
  console.log(JSON.stringify({ deployed: address, execution: 'SUCCESS', status: 'FINALIZED', sourceParityVerified: true }));
}
async function write(key, role, method, args, id, gen = 0n) {
  const client = studioClient(accounts[role]);
  if (journal.steps[key]?.hash) {
    await wait(journal.steps[key].hash, key);
    if (journal.steps[key].after && (method !== 'withdraw_credit' || journal.steps[key].nativeTransferVerified)) return;
  } else {
    const before = await snapshot(id);
    before.recipientBalanceGEN = formatUnits(await balance(accounts[role].address), 18);
    if (method === 'withdraw_credit') before.creditGEN = (await view('get_credit', [id,
      new CalldataAddress(hexToBytes(accounts[role].address))])).credit_gen;
    const quote = await client.estimateTransactionFeesForWrite({ address: journal.contractAddress,
      functionName: method, args, value: gen * 10n ** 18n, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
    await step(key, role, () => client.writeContract({ address: journal.contractAddress, functionName: method, args,
      value: gen * 10n ** 18n, fees: { distribution: quote.distribution, feeValue: quote.feeValue,
        messageAllocations: quote.messageAllocations } }), quote, before);
  }
  let after = await snapshot(id);
  if (method === 'withdraw_credit') {
    const before = journal.steps[key].before;
    const expected = parseUnits(before.contractBalanceGEN, 18) - parseUnits(before.creditGEN, 18);
    for (let i = 0; i < 20 && parseUnits(after.contractBalanceGEN, 18) !== expected; i++) {
      await new Promise(r => setTimeout(r, 3000));
      after = await snapshot(id);
    }
  }
  after.recipientBalanceGEN = formatUnits(await balance(accounts[role].address), 18);
  journal.steps[key].after = after;
  journal.steps[key].userValueGEN = gen.toString();
  if (method === 'withdraw_credit') {
    const before = journal.steps[key].before;
    const decrease = parseUnits(before.contractBalanceGEN, 18) - parseUnits(after.contractBalanceGEN, 18);
    journal.steps[key].nativeDecreaseGEN = formatUnits(decrease, 18);
    journal.steps[key].recipientNetBalanceDeltaGEN = formatUnits(
      parseUnits(after.recipientBalanceGEN, 18) - parseUnits(before.recipientBalanceGEN, 18), 18);
    if (decrease !== parseUnits(before.creditGEN, 18) || decrease <= 0n) {
      save(); throw new Error('Exact native contract-balance decrease is not proved; stop before any further value action.');
    }
    const credit = await view('get_credit', [id, new CalldataAddress(hexToBytes(accounts[role].address))]);
    if (credit.credit_gen !== '0') throw new Error('Withdrawal credit did not clear.');
    journal.steps[key].nativeTransferVerified = true;
  }
  save(); console.log(JSON.stringify({ step: key, finalized: true, userValueGEN: gen.toString(), accounting: after.accounting }));
}
async function lifecycle() {
  if (!journal.contractAddress || !journal.sourceParityVerified) throw new Error('Verified deployment required first.');
  const id = journal.demo?.id || 'cw-studio-complement-20261006-01';
  if (journal.demo?.finalBundle?.status === 'CLOSED') {
    const bundle = await view('get_bundle', [id]);
    const accounting = await view('get_accounting', [id]);
    if (bundle.status !== 'CLOSED' || accounting.liability_gen !== '0' || await balance(journal.contractAddress) !== 0n)
      throw new Error('Previously closed lifecycle no longer matches canonical state.');
    console.log(JSON.stringify({ lifecycle: 'CLOSED', recovered: true, writesPerformed: 0, accounting })); return;
  }
  if (!journal.demo) {
    const now = Math.floor(Date.now() / 1000);
    journal.demo = { id, offerDeadline: now + 3600, reviewDeadline: now + 7200, useDeadline: now + 10800,
      recovery: 'refund_expired -> buyer withdraw -> close; purchased -> consume/expire -> issuer withdrawals -> close' };
    save();
  }
  const d = journal.demo;
  await write('open', 'buyer', 'open_bundle', [id, 'Analyze the registered record and export a saved copy of the resulting insights.',
    new CalldataAddress(hexToBytes(accounts.issuerA.address)), new CalldataAddress(hexToBytes(accounts.issuerB.address)),
    d.offerDeadline, d.reviewDeadline, d.useDeadline], id, 2n);
  await write('offerA', 'issuerA', 'offer_grant', [id, 'The holder may analyze the registered record and view the resulting insights.'], id);
  await write('offerB', 'issuerB', 'offer_grant', [id, 'The holder may export and save a copy of insights from the registered record.'], id);
  const bundle = await view('get_bundle', [id]);
  for (const role of ['buyer', 'issuerA', 'issuerB']) await write('ratify-' + role, role, 'ratify_bundle', [id, bundle.definition_digest], id);
  const current = await view('get_bundle', [id]);
  if (current.status === 'RETRYABLE') throw new Error('Retryable judgment requires source/schema diagnosis before another attempt. No automatic adjudication retry.');
  if (current.status === 'READY') await write('review-' + current.attempt_count, 'buyer', 'review_bundle', [id], id);
  const judged = await view('get_bundle', [id]);
  if (judged.status !== 'PURCHASED') throw new Error('Live judgment did not purchase the complementary permit; inspect actual attempt before retry/recovery.');
  const attempt = await view('get_attempt', [id, judged.attempt_count - 1]);
  if (JSON.stringify(attempt.classes) !== JSON.stringify(['INCOMPLETE', 'INCOMPLETE', 'COMPLETE'])) throw new Error('Live complement verdict differs from the specified demonstration.');
  await write('consume', 'buyer', 'consume_permit', [id], id);
  await write('withdrawA', 'issuerA', 'withdraw_credit', [id], id);
  await write('withdrawB', 'issuerB', 'withdraw_credit', [id], id);
  await write('close', 'buyer', 'close_bundle', [id], id);
  journal.demo.finalAccounting = await view('get_accounting', [id]);
  journal.demo.finalBundle = await view('get_bundle', [id]);
  journal.demo.finalContractBalanceGEN = formatUnits(await balance(journal.contractAddress), 18);
  journal.demo.attempt = attempt; save();
  if (journal.demo.finalBundle.status !== 'CLOSED' || journal.demo.finalContractBalanceGEN !== '0') throw new Error('Zero-liability closure/native balance not proved.');
  console.log(JSON.stringify({ lifecycle: 'CLOSED', accounting: journal.demo.finalAccounting, nativeContractBalanceGEN: '0' }));
}
try {
  if (await read.getChainId() !== 61997) throw new Error('Wrong network');
  if (mode === 'inspect') console.log(JSON.stringify({ ...identity, contractAddress: journal.contractAddress || null,
    recordedSteps: Object.keys(journal.steps), writesPerformed: 0 }, null, 2));
  if (mode === 'deploy') await deploy();
  if (mode === 'lifecycle') await lifecycle();
} catch (error) {
  // All custom messages are bounded; SDK/RPC errors are reduced to a generic label.
  console.error(error?.constructor === Error ? error.message : 'Studio Dev operation failed; inspect the saved journal before retrying.');
  process.exitCode = 1;
} finally { globalThis.fetch = originalFetch; }
