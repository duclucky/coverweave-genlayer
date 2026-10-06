// Read-only discovery. Never print env contents or complete RPC errors/receipts.
import { formatUnits } from 'viem';
import { authorizedAccounts, studioClient, icRpc } from './studio-config.mjs';

try {
  const accounts = authorizedAccounts();
  const client = studioClient();
  if (await client.getChainId() !== 61997) throw new Error('Wrong network');
  const feePolicy = await client.getCurrentFeePolicy();
  const actors = [];
  for (const [role, account] of Object.entries(accounts)) {
    const balance = await client.request({ method: 'eth_getBalance', params: [account.address, 'latest'] });
    actors.push({ role, address: account.address, balanceGEN: formatUnits(BigInt(balance), 18) });
  }
  console.log(JSON.stringify({ network: 'studio-dev', chainId: 61997, icRpc,
    feeEnabled: feePolicy.enabled, actors, writesPerformed: 0 }, null, 2));
} catch { console.error('Read-only Studio Dev account inspection failed. No write was performed.'); process.exitCode = 1; }
