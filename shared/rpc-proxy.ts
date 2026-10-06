const IC_RPC = 'https://studio-next.genlayer.com/api';
const methods = new Set(['eth_chainId', 'gen_call', 'eth_getTransactionByHash',
  'eth_getTransactionReceipt', 'eth_getTransactionCount', 'eth_estimateGas',
  'eth_gasPrice', 'eth_blockNumber', 'eth_getBlockByNumber', 'sim_getFeeConfig']);
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
  if (method === 'eth_getTransactionByHash') {
    const source = record(value);
    const projected = scalars(source, ['hash', 'status', 'result', 'from', 'to',
      'from_address', 'to_address', 'created_at']);
    const rawLeaders = record(source.consensus_data).leader_receipt;
    const leaders = Array.isArray(rawLeaders) ? rawLeaders : rawLeaders && typeof rawLeaders === 'object' ? [rawLeaders] : [];
    if (leaders.length) projected.consensus_data = {
      leader_receipt: leaders.slice(0, 32).map(leader => scalars(leader, ['execution_result'])),
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
    const response = await request(IC_RPC, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('RPC unavailable');
    const upstream = record(await response.json());
    if (upstream.error) return failure(-32000, 'Studio Dev rejected this public RPC read.');
    return { jsonrpc: '2.0', id, result: projectRpcResult(input.method, upstream.result) };
  } catch { return failure(-32001, 'Studio Dev RPC is temporarily unavailable.'); }
}
