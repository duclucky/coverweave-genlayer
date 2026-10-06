// Read-only network evidence enrichment; run after the lifecycle driver exits.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectRoot, icRpc } from './studio-config.mjs';
import { saveJournal } from './studio-journal.mjs';
import { assertFinalizedSuccess } from './receipt.mjs';
import { networkTimes } from './studio-timestamps.mjs';

const path = resolve(projectRoot, 'docs/evidence/studio-dev/deployment.json');
const journal = JSON.parse(readFileSync(path, 'utf8'));
if (journal.network !== 'studio-dev' || journal.chainId !== 61997) throw new Error('Wrong evidence network.');
for (const [step, record] of Object.entries(journal.steps)) {
  if (!/^0x[a-f0-9]{64}$/i.test(record.hash)) throw new Error('Missing transaction reference.');
  const response = await fetch(icRpc, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionByHash', params: [record.hash] }),
    signal: AbortSignal.timeout(25000) });
  const payload = await response.json();
  if (!response.ok || payload.error || !payload.result) throw new Error('Receipt read unavailable; no write performed.');
  assertFinalizedSuccess(payload.result);
  const times = networkTimes(payload.result);
  if (!times.networkAcceptedAt || !times.networkFinalizedAt) throw new Error('Server consensus timestamps missing: ' + step);
  Object.assign(record, times, { timestampSource: 'consensus_history monitoring (Unix seconds)' });
  console.log(JSON.stringify({ step, hash: record.hash, status: 'FINALIZED', execution: 'SUCCESS', ...times }));
}
saveJournal(path, journal);
console.log(JSON.stringify({ enrichedTransactions: Object.keys(journal.steps).length, writesPerformed: 0 }));
