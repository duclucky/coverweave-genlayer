import test from 'node:test';
import assert from 'node:assert/strict';
import { abi } from 'genlayer-js';
import { fromRlp } from 'viem';
import { quoteStudioWrite } from '../../scripts/studio-quote.mjs';

test('write profiling uses canonical chain time and only simulates exact value/calldata', async () => {
  const actor = '0x1111111111111111111111111111111111111111';
  const contract = '0x2222222222222222222222222222222222222222';
  const receipt = { execution_result: 'SUCCESS', genvm_result: { fee_accounting: { fixture: true } } };
  const quote = { distribution: { fixture: 1n }, feeValue: 1n };
  const client = {
    async estimateTransactionFees() { return quote; },
    async request({ method, params }) {
      if (method === 'eth_getBlockByNumber') return { timestamp: '0x6ac50efc' };
      assert.equal(method, 'sim_call');
      const request = params[0];
      assert.equal(request.from, actor); assert.equal(request.to, contract);
      assert.equal(BigInt(request.value), 2n * 10n ** 18n);
      assert.equal(request.transaction_hash_variant, 'latest-final');
      assert.equal(request.sim_config.genvm_datetime, '2026-10-06T15:08:44.000Z');
      const call = abi.calldata.decode(fromRlp(request.data, 'bytes')[0]);
      assert.equal(call.get(''), 'fixture'); assert.equal(call.get('args')[0], 'bound');
      return receipt;
    },
    async estimateTransactionFeesFromSimulation(input) {
      assert.equal(input.simulation.receipt, receipt); return quote;
    },
  };
  assert.equal(await quoteStudioWrite(client, actor, contract, 'fixture', ['bound'], 2n * 10n ** 18n), quote);
  receipt.execution_result = 'ERROR';
  await assert.rejects(quoteStudioWrite(client, actor, contract, 'fixture', ['bound'], 2n * 10n ** 18n), /did not prove/);
});
