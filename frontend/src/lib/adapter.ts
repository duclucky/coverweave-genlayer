import type { EvmProvider } from "./wallet.ts";
import { createSdkAdapter } from "./sdk-adapter.ts";
export type Address = `0x${string}`;
export type BundleState =
  | "OPEN"
  | "READY"
  | "RETRYABLE"
  | "PURCHASED"
  | "REFUNDED"
  | "CLOSED";
export type Coverage = "COMPLETE" | "INCOMPLETE" | "UNVERIFIABLE";
export type PermitState = "NONE" | "AVAILABLE" | "CONSUMED" | "EXPIRED";
export interface Grant {
  issuer: Address;
  terms: string;
  assented: boolean;
}
export interface Attempt {
  index: number;
  classes: Coverage[];
  state: string;
  timestamp: number;
}
export interface Bundle {
  id: string;
  goal: string;
  buyer: Address;
  grants: [Grant, Grant];
  buyerAssented: boolean;
  state: BundleState;
  digest: string;
  offerDeadline: number;
  reviewDeadline: number;
  useDeadline: number;
  permit: PermitState;
  credits: Record<string, string>;
  attempts: Attempt[];
}
export interface CreateBundle {
  id: string;
  goal: string;
  issuerA: Address;
  issuerB: Address;
  offerDeadline: number;
  reviewDeadline: number;
  useDeadline: number;
}
export type Command =
  | { method: "open_bundle"; input: CreateBundle }
  | { method: "offer_grant"; id: string; terms: string }
  | { method: "ratify_bundle"; id: string; digest: string }
  | {
      method:
        | "review_bundle"
        | "refund_expired"
        | "consume_permit"
        | "expire_permit"
        | "withdraw_credit"
        | "close_bundle";
      id: string;
    };
export type TxStage =
  | "awaiting-signature"
  | "submitted"
  | "accepted"
  | "finalized"
  | "failed"
  | "timeout";
export interface TxStatus {
  stage: TxStage;
  hash?: string;
  message?: string;
}
export interface WalletSession {
  address: Address;
  provider: EvmProvider;
}
export interface ContractAdapter {
  ready: boolean;
  unavailableReason: string;
  address?: Address;
  listBundles(): Promise<Bundle[]>;
  getBundle(id: string): Promise<Bundle>;
  prepareWallet?(wallet: WalletSession): Promise<void>;
  probeNetwork?(): Promise<void>;
  resumeTransaction?(wallet: WalletSession, hash: string, onStatus: (status: TxStatus) => void): Promise<void>;
  transact(
    command: Command,
    wallet: WalletSession,
    onStatus: (status: TxStatus) => void,
  ): Promise<void>;
}
export const adapter: ContractAdapter = createSdkAdapter({
  contractAddress: import.meta.env?.VITE_CONTRACT_ADDRESS,
  icRpc: import.meta.env?.VITE_IC_RPC || "/api/ic",
});
export function ownCredit(bundle: Bundle, address: string): string {
  return (
    Object.entries(bundle.credits).find(
      ([owner]) => owner.toLowerCase() === address.toLowerCase(),
    )?.[1] ?? "0"
  );
}
export function availableActions(
  bundle: Bundle,
  address: string,
  now: number,
): Command["method"][] {
  if (!address || bundle.state === "CLOSED") return [];
  const buyer = bundle.buyer.toLowerCase() === address.toLowerCase();
  const ownGrant = bundle.grants.find(
    (g) => g.issuer.toLowerCase() === address.toLowerCase(),
  );
  const party = buyer || Boolean(ownGrant);
  const actions: Command["method"][] = [];
  if (bundle.state === "OPEN" && now < bundle.offerDeadline) {
    if (ownGrant && !ownGrant.terms) actions.push("offer_grant");
    if (
      bundle.grants.every((g) => g.terms) &&
      party &&
      !(buyer ? bundle.buyerAssented : ownGrant?.assented)
    )
      actions.push("ratify_bundle");
  }
  if (
    party &&
    ["READY", "RETRYABLE"].includes(bundle.state) &&
    now < bundle.reviewDeadline &&
    bundle.attempts.length < 2
  )
    actions.push("review_bundle");
  if (
    buyer &&
    ["OPEN", "READY", "RETRYABLE"].includes(bundle.state) &&
    now >= bundle.reviewDeadline
  )
    actions.push("refund_expired");
  if (buyer && bundle.state === "PURCHASED" && bundle.permit === "AVAILABLE")
    actions.push(now < bundle.useDeadline ? "consume_permit" : "expire_permit");
  if (["PURCHASED", "REFUNDED"].includes(bundle.state)) {
    if (Number(ownCredit(bundle, address)) > 0) actions.push("withdraw_credit");
    const permitFinished =
      bundle.state === "REFUNDED" ||
      ["CONSUMED", "EXPIRED"].includes(bundle.permit);
    if (
      buyer &&
      permitFinished &&
      Object.values(bundle.credits).every((v) => Number(v) === 0)
    )
      actions.push("close_bundle");
  }
  return actions;
}
export const stateLabel: Record<BundleState, string> = {
  OPEN: "Collecting permissions",
  READY: "Ready for review",
  RETRYABLE: "Needs another review",
  PURCHASED: "Bundle purchased",
  REFUNDED: "Purchase refunded",
  CLOSED: "Archived",
};
