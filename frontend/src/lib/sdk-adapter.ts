import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { CalldataAddress, TransactionHashVariant } from "genlayer-js/types";
import type { CalldataEncodable, TransactionHash } from "genlayer-js/types";
import { hexToBytes, isAddress as viemIsAddress } from "viem";
import type { Address, Bundle, BundleState, Command, ContractAdapter, Coverage, PermitState, TxStatus, WalletSession } from "./adapter.ts";
import { isAddress } from "./wallet.ts";
import { prepareStudioWallet } from "./network.ts";
import { receiptState } from "../../../scripts/receipt.mjs";

export interface AdapterConfig {
  contractAddress?: string;
  icRpc?: string;
  origin?: string;
  pollIntervalMs?: number;
  maxPolls?: number;
}

export class PendingTransactionError extends Error {
  readonly hash: string;
  constructor(hash: string) {
    super("Confirmation is still pending. Check this transaction before sending another.");
    this.name = "PendingTransactionError";
    this.hash = hash;
  }
}

function commandArgs(command: Command): CalldataEncodable[] {
  if (command.method === "open_bundle") {
    const input = command.input;
    for (const address of [input.issuerA, input.issuerB]) {
      if (!isAddress(address) || !viemIsAddress(address)) throw new Error("An issuer address is invalid.");
    }
    return [input.id, input.goal, new CalldataAddress(hexToBytes(input.issuerA)),
      new CalldataAddress(hexToBytes(input.issuerB)), input.offerDeadline, input.reviewDeadline, input.useDeadline];
  }
  if (command.method === "offer_grant") return [command.id, command.terms];
  if (command.method === "ratify_bundle") return [command.id, command.digest];
  return [command.id];
}

function chainAt(endpoint: string) {
  return { ...studioDevnet, rpcUrls: { default: { http: [endpoint] } } };
}

function transactionHash(value: unknown): TransactionHash {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error("The wallet returned an invalid transaction reference.");
  return value as TransactionHash;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") throw new Error("Studio Dev returned an unexpected view format.");
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Studio Dev returned an invalid canonical record.");
  return parsed as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== "string") throw new Error("Canonical view is missing " + key + ".");
  return value[key];
}

function integerField(value: Record<string, unknown>, key: string, maximum = Number.MAX_SAFE_INTEGER): number {
  const number = value[key];
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 0 || number > maximum) throw new Error("Canonical view has an invalid " + key + ".");
  return number;
}

function addressField(value: Record<string, unknown>, key: string): Address {
  const address = stringField(value, key);
  if (!isAddress(address) || !viemIsAddress(address)) throw new Error("Canonical view has an invalid " + key + " address.");
  return address;
}

function enumField<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error("Canonical view has an unknown state.");
  return value as T;
}

function validId(id: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error("Agreement ID is invalid.");
}

export function createSdkAdapter(config: AdapterConfig): ContractAdapter {
  const valid = Boolean(config.contractAddress && isAddress(config.contractAddress) && viemIsAddress(config.contractAddress));
  const unavailableReason = valid ? "" : "VITE_CONTRACT_ADDRESS is missing or invalid. Live agreement reads and writes are unavailable.";
  const path = config.icRpc || "/api/ic";
  if (path !== "/api/ic") throw new Error("VITE_IC_RPC must use the same-origin /api/ic proxy.");
  const origin = config.origin || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const endpoint = new URL(path, origin).href;
  const address = valid ? config.contractAddress as Address : undefined;
  if (!studioDevnet.consensusMainContract || !isAddress(studioDevnet.consensusMainContract.address) || studioDevnet.id !== 61997) {
    throw new Error("The SDK consensus address or Studio Dev chain is invalid.");
  }
  const reader = createClient({ chain: chainAt(endpoint) });
  const outstanding = new Map<string, TransactionHash>();
  const interval = config.pollIntervalMs ?? 2500;
  const maxPolls = config.maxPolls ?? 72;

  async function view(functionName: string, args: CalldataEncodable[] = []) {
    if (!address) throw new Error(unavailableReason);
    return reader.readContract({ address, functionName, args,
      transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
  }

  async function getBundle(id: string): Promise<Bundle> {
    validId(id);
    const canonical = record(await view("get_bundle", [id]));
    if (canonical.id !== id || canonical.purchase_gen !== "2") throw new Error("Canonical agreement binding does not match.");
    const buyer = addressField(canonical, "buyer");
    const a = addressField(canonical, "issuer_a");
    const b = addressField(canonical, "issuer_b");
    const roles = [buyer, a, b];
    if (new Set(roles.map(x => x.toLowerCase())).size !== 3) throw new Error("Canonical agreement roles are invalid.");
    const digest = stringField(canonical, "definition_digest");
    if (digest && !/^[a-f0-9]{64}$/.test(digest)) throw new Error("Canonical definition reference is invalid.");
    const assents = integerField(canonical, "assents", 7);
    const count = integerField(canonical, "attempt_count", 2);
    const [grantA, grantB, ...creditRecords] = await Promise.all([
      view("get_grant", [id, "A"]).then(record), view("get_grant", [id, "B"]).then(record),
      ...roles.map(owner => view("get_credit", [id, new CalldataAddress(hexToBytes(owner))]).then(record)),
    ]);
    const grants = [grantA, grantB].map((grant, index) => {
      if (grant.slot !== (index === 0 ? "A" : "B") || addressField(grant, "issuer").toLowerCase() !== roles[index + 1].toLowerCase()
          || grant.definition_digest !== digest) throw new Error("Canonical grant binding does not match.");
      return { issuer: roles[index + 1], terms: stringField(grant, "terms"), assented: Boolean(assents & (1 << (index + 1))) };
    });
    const credits: Record<string, string> = {};
    creditRecords.forEach((credit, index) => {
      if (credit.bundle_id !== id || addressField(credit, "owner").toLowerCase() !== roles[index].toLowerCase()) throw new Error("Canonical credit binding does not match.");
      const amount = stringField(credit, "credit_gen");
      if (!/^[012]$/.test(amount)) throw new Error("Canonical credit GEN amount is invalid.");
      credits[roles[index]] = amount;
    });
    const attempts = [];
    for (let index = 0; index < count; index++) {
      const attempt = record(await view("get_attempt", [id, index]));
      if (attempt.index !== index || attempt.definition_digest !== digest || !Array.isArray(attempt.classes) || attempt.classes.length !== 3) {
        throw new Error("Canonical coverage history binding does not match.");
      }
      attempts.push({ index, classes: attempt.classes.map(c => enumField<Coverage>(c, ["COMPLETE", "INCOMPLETE", "UNVERIFIABLE"])),
        state: enumField(attempt.outcome, ["RETRYABLE", "PURCHASED", "REFUNDED"]), timestamp: integerField(attempt, "reviewed_at") });
    }
    return { id, goal: stringField(canonical, "goal"), buyer, grants: [grants[0], grants[1]],
      buyerAssented: Boolean(assents & 1), state: enumField<BundleState>(canonical.status, ["OPEN", "READY", "RETRYABLE", "PURCHASED", "REFUNDED", "CLOSED"]),
      digest, offerDeadline: integerField(canonical, "offer_deadline"), reviewDeadline: integerField(canonical, "review_deadline"),
      useDeadline: integerField(canonical, "use_deadline"), permit: enumField<PermitState>(canonical.permit, ["NONE", "AVAILABLE", "CONSUMED", "EXPIRED"]),
      credits, attempts };
  }

  async function confirm(hash: TransactionHash, onStatus: (state: TxStatus) => void) {
    let reportedAccepted = false;
    for (let attempt = 0; attempt < maxPolls; attempt++) {
      let state;
      let canceled = false;
      try {
        const receipt = await reader.getTransaction({ hash });
        state = receiptState(receipt);
        canceled = receipt.lifecycle?.state === "canceled";
      } catch {
        // A submitted envelope may not yet be indexed. Retry the read only.
        if (attempt + 1 < maxPolls) await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      if (canceled || state.execution === "ERROR" || (state.finalized && !state.accepted)) {
        onStatus({ stage: "failed", hash, message: "The contract call did not execute successfully. Canonical state will show the outcome." });
        throw new Error("The contract transaction failed. Refresh the agreement before retrying.");
      }
      if (state.accepted && !reportedAccepted) {
        onStatus({ stage: "accepted", hash });
        reportedAccepted = true;
      }
      if (state.accepted && state.finalized && state.execution === "SUCCESS") {
        onStatus({ stage: "finalized", hash });
        return;
      }
      if (attempt + 1 < maxPolls) await new Promise(resolve => setTimeout(resolve, interval));
    }
    onStatus({ stage: "timeout", hash, message: "Studio Dev has not yet proved finalized successful execution. Check confirmation; do not repeat the write." });
    throw new PendingTransactionError(hash);
  }

  return {
    ready: valid, unavailableReason, address,
    prepareWallet: prepareStudioWallet,
    async probeNetwork() {
      const chainId = await reader.getChainId();
      if (chainId !== studioDevnet.id) throw new Error("The read connection is on another network.");
    },
    async resumeTransaction(wallet, hash, onStatus) {
      if (!address) throw new Error(unavailableReason);
      await prepareStudioWallet(wallet);
      const reference = transactionHash(hash);
      const key = wallet.address.toLowerCase();
      const existing = outstanding.get(key);
      if (existing && existing !== reference) throw new Error("A different transaction is still pending for this wallet.");
      try {
        await confirm(reference, onStatus);
        outstanding.delete(key);
      } catch (error) {
        if (!(error instanceof PendingTransactionError)) outstanding.delete(key);
        throw error;
      }
    },
    getBundle,
    async listBundles() {
      const ids: string[] = [];
      for (let offset = 0; offset < 1024; offset += 32) {
        const raw = await view("list_bundle_ids", [offset, 32]);
        if (typeof raw !== "string") throw new Error("Workspace list format is invalid.");
        const page: unknown = JSON.parse(raw);
        if (!Array.isArray(page) || page.length > 32 || page.some(id => typeof id !== "string")) throw new Error("Workspace list is invalid.");
        for (const id of page) {
          validId(id);
          if (ids.includes(id)) throw new Error("Canonical workspace IDs are duplicated.");
          ids.push(id);
        }
        if (page.length < 32) {
          const bundles = [];
          // Keep IC-RPC fanout bounded on the shared Studio service.
          for (const id of ids) bundles.push(await getBundle(id));
          return bundles.reverse();
        }
      }
      throw new Error("This workspace exceeds the current 1024-agreement browser limit.");
    },
    async transact(command: Command, wallet: WalletSession, onStatus) {
      if (!address) throw new Error(unavailableReason);
      if (!isAddress(wallet.address) || !viemIsAddress(wallet.address)) throw new Error("Selected wallet address is invalid.");
      const args = commandArgs(command);
      const pending = outstanding.get(wallet.address.toLowerCase());
      if (pending) throw new PendingTransactionError(pending);
      await prepareStudioWallet(wallet);
      onStatus({ stage: "awaiting-signature" });
      let submitted: TransactionHash | undefined;
      const provider = { async request(request: Parameters<WalletSession["provider"]["request"]>[0]) {
        const value = await wallet.provider.request(request);
        if (request.method === "eth_sendTransaction") {
          submitted = transactionHash(value);
          outstanding.set(wallet.address.toLowerCase(), submitted);
          onStatus({ stage: "submitted", hash: submitted });
        }
        return value;
      } };
      // Address is normalized here by the actual SDK; no per-call account override.
      const writer = createClient({ chain: chainAt(endpoint), account: wallet.address, provider });
      let envelopeCompleted = false;
      try {
        const hash = await writer.writeContract({ address, functionName: command.method, args,
          value: command.method === "open_bundle" ? 2n * 10n ** 18n : 0n });
        envelopeCompleted = true;
        await confirm(transactionHash(hash), onStatus);
        outstanding.delete(wallet.address.toLowerCase());
      } catch (error) {
        if (error instanceof PendingTransactionError) throw error;
        if (envelopeCompleted) {
          outstanding.delete(wallet.address.toLowerCase());
          throw error;
        }
        if (submitted) {
          // SDK envelope waiting can fail after the wallet already broadcast.
          // Poll the existing reference instead of broadcasting again.
          try {
            await confirm(submitted, onStatus);
            outstanding.delete(wallet.address.toLowerCase());
            return;
          } catch (confirmation) {
            if (!(confirmation instanceof PendingTransactionError)) outstanding.delete(wallet.address.toLowerCase());
            throw confirmation;
          }
        }
        throw new Error("The selected wallet did not submit this transaction. Check your network and try again.");
      }
    },
  };
}
