import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareScenario, recoveryActions } from '../../scripts/studio-scenarios.mjs';

test('scenario resumes its original entity/deadlines and cannot overwrite another demo', () => {
  const journal = { demo: { id: 'original-complement', offerDeadline: 10 } };
  const first = prepareScenario(journal, 'expiry', 1000);
  assert.equal(prepareScenario(journal, 'expiry', 9000), first);
  assert.equal(first.reviewDeadline, 1180);
  assert.equal(journal.demo.id, 'original-complement');
  const before = JSON.stringify(journal);
  assert.throws(() => prepareScenario(journal, 'not-authorized', 1000), /Unknown/);
  assert.equal(JSON.stringify(journal), before);
});

test('recovery follows actual canonical credits and permit, never expected model shares', () => {
  assert.deepEqual(recoveryActions({ status: 'REFUNDED', permit: 'NONE' }, { buyer: '2', issuerA: '0', issuerB: '0' }),
    [{ role: 'buyer', method: 'withdraw_credit' }, { role: 'buyer', method: 'close_bundle' }]);
  assert.deepEqual(recoveryActions({ status: 'PURCHASED', permit: 'AVAILABLE' }, { buyer: '0', issuerA: '0', issuerB: '2' }),
    [{ role: 'buyer', method: 'consume_permit' }, { role: 'issuerB', method: 'withdraw_credit' }, { role: 'buyer', method: 'close_bundle' }]);
  assert.deepEqual(recoveryActions({ status: 'CLOSED', permit: 'CONSUMED' }, { buyer: '0', issuerA: '0', issuerB: '0' }), []);
  assert.throws(() => recoveryActions({ status: 'RETRYABLE' }, { buyer: '0', issuerA: '0', issuerB: '0' }), /diagnosis/);
  assert.throws(() => recoveryActions({ status: 'REFUNDED' }, { buyer: '3', issuerA: '0', issuerB: '0' }), /credit/);
});
