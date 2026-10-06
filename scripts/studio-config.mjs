import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { privateKeyToAccount } from 'viem/accounts';
import { createClient } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const icRpc = 'https://studio-next.genlayer.com/api';
export const explorer = 'https://explorer-studio-dev.genlayer.com';
export function studioChain() {
  if (studioDevnet.id !== 61997 || studioDevnet.nativeCurrency.symbol !== 'GEN')
    throw new Error('Installed SDK does not match Studio Dev.');
  return { ...studioDevnet, rpcUrls: { default: { http: [icRpc] } } };
}
export function authorizedAccounts() {
  const files = [resolve(projectRoot, '.env'), resolve(projectRoot, '..', '.env')];
  const config = {};
  for (const path of files) if (existsSync(path)) {
    const parsed = parseEnv(readFileSync(path, 'utf8'));
    for (const [name, value] of Object.entries(parsed)) if (!config[name]?.trim() && value.trim()) config[name] = value;
  }
  const aliases = {
    buyer: ['GENLAYER_PRIVATE_KEY', 'STUDIONET_PRIVATE_KEY'],
    issuerA: ['GENLAYER_INTEGRATOR_PRIVATE_KEY', 'STUDIONET_INTEGRATOR_PRIVATE_KEY'],
    issuerB: ['GENLAYER_STEWARD_PRIVATE_KEY', 'STUDIONET_STEWARD_PRIVATE_KEY'],
  };
  const accounts = {};
  for (const [role, names] of Object.entries(aliases)) {
    const value = names.map(name => config[name]?.trim()).find(Boolean);
    if (!value || !/^(0x)?[a-f0-9]{64}$/i.test(value)) throw new Error('Authorized ' + role + ' key missing or invalid after project/parent discovery.');
    accounts[role] = privateKeyToAccount(value.startsWith('0x') ? value : '0x' + value);
  }
  if (new Set(Object.values(accounts).map(a => a.address.toLowerCase())).size !== 3)
    throw new Error('Three distinct authorized roles are required.');
  return accounts;
}
export function studioClient(account) { return createClient({ chain: studioChain(), account }); }
