import { test } from 'node:test';
import assert from 'node:assert/strict';
import { networkTimes } from '../../scripts/studio-timestamps.mjs';

test('uses server monitoring and the final accepted round, never observation time', () => {
  assert.deepEqual(networkTimes({ finalized_at: 'untrusted',
    consensus_history: { current_monitoring: { FINALIZED: 1791298647.5 },
      consensus_results: [{ monitoring: { ACCEPTED: 1791298600 } }, { monitoring: { ACCEPTED: 1791298620 } }] } }),
  { networkAcceptedAt: '2026-10-06T14:57:00.000Z', networkFinalizedAt: '2026-10-06T14:57:27.500Z' });
  assert.deepEqual(networkTimes({ consensus_history: { current_monitoring: { FINALIZED: '1791298647' } } }),
    { networkAcceptedAt: null, networkFinalizedAt: null });
});
