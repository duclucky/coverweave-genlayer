import { spawn } from 'node:child_process';
import { join } from 'node:path';

const windows = process.platform === 'win32';
const executable = join('.venv', windows ? 'Scripts/python.exe' : 'bin/python');
const gltest = join('.venv', windows ? 'Scripts/gltest.exe' : 'bin/gltest');
const env = { ...process.env, PYTHONUTF8: '1', GENVM_VERSION: 'v0.6.0-rc8' };
let server;
try {
  try {
    await fetch('http://127.0.0.1:4187/health', { signal: AbortSignal.timeout(500) });
    throw new Error('Port 4187 is occupied; stop the prior local integration server first.');
  } catch (error) {
    if (error.message.includes('occupied')) throw error;
  }
  server = spawn(executable, ['scripts/local_sim.py'], { env, windowsHide: true, stdio: 'ignore' });
  server.on('error', error => { console.error(error.name); });
  let healthy = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:4187/health', { signal: AbortSignal.timeout(500) });
      healthy = response.ok && (await response.json()).status === 'ok';
      if (healthy) break;
    } catch {}
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!healthy) throw new Error('Local integration simulator did not start.');
  const tests = spawn(gltest, ['tests/integration', '-v', '-s', '--network', 'localnet', '--tb=short'],
    { env, windowsHide: true, stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => {
    tests.on('error', reject);
    tests.on('exit', resolve);
  });
  if (code !== 0) process.exitCode = code ?? 1;
} finally {
  if (server && server.exitCode === null) server.kill();
}
