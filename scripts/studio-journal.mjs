import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function readJournal(path, identity) {
  if (!existsSync(path)) return { ...identity, steps: {} };
  const journal = JSON.parse(readFileSync(path, 'utf8'));
  for (const key of ['network', 'chainId', 'sourceCommit', 'sourceSha256', 'runner', 'apiVersion'])
    if (journal[key] !== identity[key]) throw new Error('Existing deployment identity differs: ' + key + '. Archive explicitly; do not replay.');
  if (!journal.steps || typeof journal.steps !== 'object') throw new Error('Invalid transaction journal.');
  return journal;
}
export function saveJournal(path, journal) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = path + '.tmp';
  writeFileSync(temporary, JSON.stringify(journal, null, 2) + '\n');
  renameSync(temporary, path);
}
export function recordBroadcast(journal, key, actor, hash) {
  if (!/^0x[a-f0-9]{64}$/i.test(hash)) throw new Error('Invalid broadcast reference.');
  if (journal.steps[key]?.hash) {
    if (journal.steps[key].hash !== hash) throw new Error('Refusing a second broadcast for the same lifecycle step.');
    return;
  }
  journal.steps[key] = { ...journal.steps[key], actor, hash, status: 'SUBMITTED',
    submittedAtObservedUTC: new Date().toISOString() };
}
