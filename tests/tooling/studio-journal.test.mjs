import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJournal, saveJournal, recordBroadcast } from '../../scripts/studio-journal.mjs';

test('deployment journal recovers exact identity and never overwrites a broadcast', t => {
  const directory = mkdtempSync(join(tmpdir(), 'coverweave-journal-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'deployment.json');
  const identity = { network: 'studio-dev', chainId: 61997, sourceCommit: 'fixture',
    sourceSha256: 'fixture', runner: 'fixture', apiVersion: 'v0.3.0' };
  const journal = readJournal(path, identity);
  const hash = '0x' + '11'.repeat(32);
  recordBroadcast(journal, 'deploy', 'public-actor', hash);
  saveJournal(path, journal);
  assert.equal(readJournal(path, identity).steps.deploy.hash, hash);
  const before = JSON.stringify(journal);
  recordBroadcast(journal, 'deploy', 'public-actor', hash);
  assert.equal(JSON.stringify(journal), before);
  assert.throws(() => recordBroadcast(journal, 'deploy', 'public-actor', '0x' + '22'.repeat(32)), /second broadcast/);
  assert.equal(JSON.stringify(journal), before);
  assert.throws(() => readJournal(path, { ...identity, sourceCommit: 'different' }), /identity differs/);
});
