import { studioDevnet } from "genlayer-js/chains";
import type { WalletSession } from "./adapter.ts";
import { isAddress } from "./wallet.ts";

export const STUDIO_CHAIN_ID = studioDevnet.id;
export const STUDIO_WALLET_RPC = studioDevnet.rpcUrls.default.http[0];
export const STUDIO_IC_RPC = "https://studio-next.genlayer.com/api";
export const STUDIO_EXPLORER = "https://explorer-studio-dev.genlayer.com";

export async function prepareStudioWallet(wallet: WalletSession): Promise<void> {
  if (!isAddress(wallet.address)) throw new Error("Selected wallet address is invalid.");
  if (STUDIO_CHAIN_ID !== 61997 || studioDevnet.nativeCurrency.symbol !== "GEN") {
    throw new Error("The installed SDK does not match the locked Studio Dev network.");
  }
  const chainId = `0x${STUDIO_CHAIN_ID.toString(16)}`;
  const current = await wallet.provider.request({ method: "eth_chainId" });
  if (typeof current !== "string" || BigInt(current) !== BigInt(STUDIO_CHAIN_ID)) {
    try {
      await wallet.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 4902)) {
        throw new Error("Switch your selected wallet to Studio Dev to continue.");
      }
      await wallet.provider.request({ method: "wallet_addEthereumChain", params: [{
        chainId, chainName: studioDevnet.name, nativeCurrency: studioDevnet.nativeCurrency,
        rpcUrls: [...studioDevnet.rpcUrls.default.http], blockExplorerUrls: [STUDIO_EXPLORER],
      }] });
      await wallet.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    }
  }
  const verified = await wallet.provider.request({ method: "eth_chainId" });
  if (typeof verified !== "string" || BigInt(verified) !== BigInt(STUDIO_CHAIN_ID)) {
    throw new Error("The selected wallet is still on another network.");
  }
  const accounts = await wallet.provider.request({ method: "eth_accounts" });
  if (!Array.isArray(accounts) || !accounts.some(a => typeof a === "string" && a.toLowerCase() === wallet.address.toLowerCase())) {
    throw new Error("The selected wallet account changed. Reconnect before continuing.");
  }
}
