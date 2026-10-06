// Parsed receipt projection is the only allowed evidence/logging boundary.
// Shapes verified against genlayer-js rc commit
// 672631bfff0a21a25d95591a523497f7c46fd01d and raw Studio leader receipts.
export function receiptState(receipt) {
  const lifecycle = receipt?.lifecycle;
  const status = receipt?.statusName ?? receipt?.status_name ?? receipt?.status;
  const named = typeof status === 'string' ? status.toUpperCase() : status;
  let finalized = named === 'FINALIZED' || named === 7;
  let accepted = finalized || named === 'ACCEPTED' || named === 5;
  if (lifecycle && typeof lifecycle === 'object') {
    finalized = lifecycle.state === 'finalized';
    accepted = (finalized && [undefined, 'accepted'].includes(lifecycle.outcome)) ||
      (lifecycle.state === 'decided' && lifecycle.outcome === 'accepted');
  }
  const evidence = [];
  const add = (value) => {
    if (value === undefined || value === null) return;
    if (value === 'SUCCESS' || value === 'FINISHED_WITH_RETURN' || value === 1) evidence.push('SUCCESS');
    else if (['ERROR', 'FINISHED_WITH_ERROR', 'TIMEOUT', 'NONDET_DISAGREE',
      'DETERMINISTIC_VIOLATION', 2, 3, 4, 5].includes(value)) evidence.push('ERROR');
    else evidence.push('UNKNOWN');
  };
  add(receipt?.txExecutionResultName);
  add(receipt?.txExecutionResult);
  const leaders = receipt?.consensus_data?.leader_receipt;
  for (const leader of Array.isArray(leaders) ? leaders : leaders ? [leaders] : []) {
    add(leader?.execution_result);
  }
  const execution = evidence.includes('ERROR') ? 'ERROR' :
    evidence.length && evidence.every(value => value === 'SUCCESS') ? 'SUCCESS' : 'UNKNOWN';
  return { accepted: Boolean(accepted), finalized: Boolean(finalized), execution };
}

export function assertFinalizedSuccess(receipt) {
  const state = receiptState(receipt);
  if (!state.accepted || !state.finalized || state.execution !== 'SUCCESS') {
    throw new Error('GenLayer finalized successful execution is not proved.');
  }
  return state;
}
