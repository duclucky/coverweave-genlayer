import { abi } from 'genlayer-js';
import { TransactionHashVariant } from 'genlayer-js/types';

// Current Studio's write profiler does not expose its simulation clock through
// the RC SDK helper. Simulate at the observed chain time, never override a write.
export async function quoteStudioWrite(client, actor, address, method, args, value) {
  const block = await client.request({ method: 'eth_getBlockByNumber', params: ['latest', false] });
  if (typeof block?.timestamp !== 'string' || !/^0x[0-9a-f]+$/i.test(block.timestamp))
    throw new Error('Canonical chain time is unavailable for profiling.');
  const timestamp = Number(BigInt(block.timestamp));
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error('Invalid canonical chain time.');
  const baseline = await client.estimateTransactionFees();
  const fees = JSON.parse(JSON.stringify({ distribution: baseline.distribution, feeValue: baseline.feeValue,
    messageAllocations: baseline.messageAllocations || [] }, (_key, field) => typeof field === 'bigint' ? field.toString() : field));
  const data = abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject(method, args)), false]);
  const receipt = await client.request({ method: 'sim_call', params: [{ type: 'write', to: address, from: actor,
    data, value: '0x' + value.toString(16), fees, transaction_hash_variant: TransactionHashVariant.LATEST_FINAL,
    sim_config: { genvm_datetime: new Date(timestamp * 1000).toISOString() } }] });
  if (receipt?.execution_result !== 'SUCCESS' || !receipt?.genvm_result?.fee_accounting)
    throw new Error('Representative write simulation did not prove successful execution and measured fees.');
  return client.estimateTransactionFeesFromSimulation({ simulation: { receipt } });
}
