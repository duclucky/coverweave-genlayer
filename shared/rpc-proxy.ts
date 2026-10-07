import { abi } from 'genlayer-js';
import { fromRlp, isAddress } from 'viem';
const IC_RPC = 'https://studio-next.genlayer.com/api';
const CONTRACT = '0xe4F0378799b47e7AE05F64d93dFE6590F68C5833';
const methods = new Set(['eth_chainId', 'gen_call', 'eth_getTransactionByHash',
  'eth_getTransactionReceipt', 'eth_getTransactionCount', 'eth_estimateGas',
  'eth_gasPrice', 'eth_blockNumber', 'eth_getBlockByNumber', 'sim_getFeeConfig', 'sim_estimateTransactionFees']);
const writes = new Set(['open_bundle','offer_grant','ratify_bundle','review_bundle','refund_expired',
  'consume_permit','expire_permit','withdraw_credit','close_bundle']);
const distributionFields = ['leaderTimeunitsAllocation','validatorTimeunitsAllocation','appealRounds',
  'executionBudgetPerRound','executionConsumed','totalMessageFees','maxPriceGenPerTimeUnit',
  'storageFeeMaxGasPrice','receiptFeeMaxGasPrice'];
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue : {};
}
function scalars(value: unknown, keys: readonly string[]): RecordValue {
  const source = record(value);
  return Object.fromEntries(keys.filter(key => ['string', 'number', 'boolean'].includes(typeof source[key]))
    .map(key => [key, source[key]]));
}
export function allowedRpcMethod(method: string): boolean { return methods.has(method); }

// Never forward a complete Studio receipt: it can contain private node configuration.
export function projectRpcResult(method: string, value: unknown): unknown {
  if (value === null) return null;
  if (method === 'sim_estimateTransactionFees') {
    const preset = record(record(value).recommendedPreset);
    const source = record(preset.distribution);
    if (!['string','number'].includes(typeof preset.feeValue) || !/^\d+$/.test(String(preset.feeValue)) || !Array.isArray(source.rotations))
      throw new Error('Public fee preset unavailable.');
    return { recommendedPreset: { feeValue: String(preset.feeValue),
      distribution: { ...scalars(source, distributionFields), rotations: source.rotations.map(item => {
        if (!/^\d+$/.test(String(item))) throw new Error('Invalid public fee allocation.');
        return String(item);
      }) }, messageAllocations: Array.isArray(preset.messageAllocations) ? preset.messageAllocations.slice(0,32)
        .map(item => scalars(item,['messageType','onAcceptance','parentIndex','recipient','callKey','budget','feeParams'])) : [] } };
  }
  if (method === 'eth_getTransactionByHash') {
    const source = record(value);
    const projected = scalars(source, ['hash', 'status', 'result', 'from', 'to',
      'from_address', 'to_address', 'created_at', 'txExecutionResult', 'txExecutionResultName']);
    const rawLeaders = record(source.consensus_data).leader_receipt;
    const leaders = Array.isArray(rawLeaders) ? rawLeaders : rawLeaders && typeof rawLeaders === 'object' ? [rawLeaders] : [];
    if (leaders.length) projected.consensus_data = {
      leader_receipt: leaders.slice(0, 32).map(leader => scalars(leader, ['execution_result', 'mode'])),
    };
    return projected;
  }
  if (method === 'sim_getFeeConfig') {
    const source = record(value);
    return { ...scalars(source, ['enabled']), policy: scalars(source.policy,
      ['genPerTimeUnit', 'storageUnitPrice', 'receiptGasPrice', 'timeUnitOverlayBps',
        'intrinsicGas', 'bootloaderOverhead', 'gasPerChangedSlot', 'calldataGasPerByte',
        'fixedProposeReceiptGas', 'fixedMessageRevealGas', 'messageFeeParamsBudgetFloor']) };
  }
  if (method === 'eth_getTransactionReceipt') {
    const source = record(value);
    return { ...scalars(source, ['transactionHash', 'transactionIndex', 'blockHash',
      'blockNumber', 'from', 'to', 'cumulativeGasUsed', 'gasUsed', 'contractAddress',
      'logsBloom', 'status', 'type', 'effectiveGasPrice']),
      logs: Array.isArray(source.logs) ? source.logs.slice(0, 128).map(log => {
        const item = record(log);
        return { ...scalars(item, ['address', 'data', 'blockNumber', 'transactionHash',
          'transactionIndex', 'blockHash', 'logIndex', 'removed']),
          topics: Array.isArray(item.topics) ? item.topics.filter(topic =>
            typeof topic === 'string' && /^0x[0-9a-f]{64}$/i.test(topic)).slice(0, 4) : [] };
      }) : [] };
  }
  if (method === 'eth_getBlockByNumber') return scalars(value, ['hash', 'parentHash',
    'number', 'timestamp', 'baseFeePerGas', 'gasLimit', 'gasUsed', 'size', 'nonce',
    'difficulty', 'totalDifficulty', 'miner', 'extraData', 'mixHash', 'logsBloom',
    'receiptsRoot', 'stateRoot', 'transactionsRoot', 'sha3Uncles']);
  // Current Studio gen_call returns even-length calldata hex without 0x.
  if (method === 'gen_call' && typeof value === 'string' && value.length <= 262144 &&
      /^(?:0x)?(?:[0-9a-f]{2})*$/i.test(value)) return value;
  if (typeof value === 'string' && /^0x[0-9a-f]*$/i.test(value)) return value;
  throw new Error('Unexpected public RPC response shape.');
}

export async function forwardRpc(body: unknown, request: typeof fetch = fetch) {
  const input = record(body);
  const id = typeof input.id === 'string' || typeof input.id === 'number' ? input.id : null;
  const failure = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (input.jsonrpc !== '2.0' || typeof input.method !== 'string' ||
      !allowedRpcMethod(input.method) || !Array.isArray(input.params))
    return failure(-32600, 'Only supported public RPC reads are permitted.');
  if (input.method === 'gen_call' && record(input.params[0]).type !== 'read')
    return failure(-32602, 'Contract calls must be reads.');
  const envelope = { jsonrpc: '2.0', id, method: input.method, params: input.params };
  if (JSON.stringify(envelope).length > 65536) return failure(-32602, 'RPC request is too large.');
  try {
    if (input.method === 'sim_estimateTransactionFees') {
      const call = record(input.params[0]);
      if (input.params.length !== 1 || call.type !== 'write' || typeof call.from !== 'string' || !isAddress(call.from) ||
        typeof call.to !== 'string' || call.to.toLowerCase() !== CONTRACT.toLowerCase() || typeof call.data !== 'string')
        return failure(-32602,'Only this contract may be profiled.');
      const wire = fromRlp(call.data as `0x${string}`, 'bytes');
      if (!Array.isArray(wire) || wire.length !== 2) return failure(-32602,'Invalid write profile.');
      const decoded = abi.calldata.decode(wire[0] as Uint8Array) as Map<string,unknown>;
      const method = decoded.get('');
      if (typeof method !== 'string' || !writes.has(method) ||
        BigInt(String(call.value ?? '0')) !== (method === 'open_bundle' ? 2n * 10n ** 18n : 0n))
        return failure(-32602,'Invalid write profile or purchase value.');
      const blockResponse = await request(IC_RPC,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id,method:'eth_getBlockByNumber',params:['latest',false]}),signal:AbortSignal.timeout(25000)});
      const block = record(record(await blockResponse.json()).result);
      if (typeof block.timestamp !== 'string' || !/^0x[0-9a-f]+$/i.test(block.timestamp)) throw new Error('Chain time unavailable.');
      // Simulation only. Client clocks, mocks and all other simulation overrides are discarded.
      envelope.params = [{type:'write',from:call.from,to:CONTRACT,data:call.data,value:call.value ?? '0x0',
        fees:call.fees,transaction_hash_variant:'latest-final',sim_config:{genvm_datetime:new Date(Number(BigInt(block.timestamp))*1000).toISOString()}}];
    }
    const response = await request(IC_RPC, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(input.method === 'sim_estimateTransactionFees' ? 55000 : 25000) });
    if (!response.ok) throw new Error('RPC unavailable');
    const upstream = record(await response.json());
    if (upstream.error) return failure(-32000, 'Studio Dev rejected this public RPC read.');
    return { jsonrpc: '2.0', id, result: projectRpcResult(input.method, upstream.result) };
  } catch { return failure(-32001, 'Studio Dev RPC is temporarily unavailable.'); }
}
