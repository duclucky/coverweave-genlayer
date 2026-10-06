import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve, delimiter } from 'node:path';

const python = join('.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) throw new Error('Create the repository Python 3.12 .venv and install requirements.txt first.');
// Linter subprocesses must use the installed project tools, not global pyright.
const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') ?? 'PATH';
const env = { ...process.env, [pathKey]: resolve('.venv', process.platform === 'win32' ? 'Scripts' : 'bin') +
  delimiter + (process.env[pathKey] ?? ''), PYTHONUTF8: '1', GENVM_VERSION: 'v0.6.0-rc8' };
for (const args of [
  ['scripts/linter_v03_compat.py'],
  ['-m', 'genvm_linter.cli', 'check', 'contracts/coverweave.py'],
  ['-m', 'genvm_linter.cli', 'typecheck', 'contracts/coverweave.py'],
  ['-m', 'genvm_linter.cli', 'schema', 'contracts/coverweave.py', '--output', 'docs/contract-schema.json'],
  ['-m', 'pytest', 'tests/direct', 'tests/tooling', '-q', '--tb=short'],
]) {
  const result = spawnSync(python, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
