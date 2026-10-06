import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiptState } from '../../scripts/receipt.mjs';

test('raw Studio finalized SUCCESS is recognized; node config never escapes', () => {
  const raw = { status: 'FINALIZED', consensus_data: { leader_receipt: [
    { execution_result: 'SUCCESS', node_config: { private: 'never-project' }, genvm_result: { stdout: 'never-project' } },
  ] } };
  assert.deepEqual(receiptState(raw), { accepted: true, finalized: true, execution: 'SUCCESS' });
  assert.ok(!JSON.stringify(receiptState(raw)).includes('never-project'));
});
test('normalized rc SDK finalized execution fields are recognized', () => {
  assert.deepEqual(receiptState({ lifecycle: { state: 'finalized', outcome: 'accepted' },
    status: 7, txExecutionResultName: 'FINISHED_WITH_RETURN', txExecutionResult: 1 }),
    { accepted: true, finalized: true, execution: 'SUCCESS' });
});
test('accepted result is not yet finalized', () => {
  assert.deepEqual(receiptState({ lifecycle: { state: 'decided', outcome: 'accepted' },
    txExecutionResultName: 'FINISHED_WITH_RETURN' }),
    { accepted: true, finalized: false, execution: 'SUCCESS' });
});
test('finalized parent with failed execution is never successful', () => {
  const result = receiptState({ status: 'FINALIZED', consensus_data: {
    leader_receipt: [{ execution_result: 'ERROR' }] } });
  assert.equal(result.execution, 'ERROR');
});
test('missing execution evidence cannot prove success', () => {
  assert.equal(receiptState({ status: 'FINALIZED' }).execution, 'UNKNOWN');
});
test('EVM inclusion receipt cannot prove IC finality', () => {
  assert.equal(receiptState({ status: '0x1', blockNumber: '0x123' }).finalized, false);
  assert.equal(receiptState({ status: '0x1' }).execution, 'UNKNOWN');
});
test('contradictory execution fields fail closed', () => {
  assert.equal(receiptState({ status: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN',
    consensus_data: { leader_receipt: [{ execution_result: 'ERROR' }] } }).execution, 'ERROR');
});
test('unknown or multiple contradictory leader receipts fail closed', () => {
  assert.equal(receiptState({ status: 'FINALIZED', consensus_data: {
    leader_receipt: [{ execution_result: 'SUCCESS' }, { execution_result: 'ERROR' }] } }).execution, 'ERROR');
  assert.equal(receiptState({ status: 'FINALIZED', txExecutionResult: 0 }).execution, 'UNKNOWN');
});
test('cancel, timeout and rejected outcomes do not imply accepted execution', () => {
  for (const outcome of ['undetermined', 'validators-timeout', 'leader-timeout']) {
    const result = receiptState({ lifecycle: { state: 'decided', outcome }, txExecutionResult: 1 });
    assert.equal(result.accepted, false);
    assert.equal(result.finalized, false);
  }
  assert.equal(receiptState({ lifecycle: { state: 'canceled' }, txExecutionResult: 1 }).accepted, false);
});
