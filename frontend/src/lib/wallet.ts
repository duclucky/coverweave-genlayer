export interface EvmProvider {
  request(args: {
    method: string;
    params?: unknown[] | object;
  }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}
export interface DetectedWallet {
  id: string;
  name: string;
  provider: EvmProvider;
}
export function discoverWallets(
  surface: Window,
  onChange: (wallets: DetectedWallet[]) => void,
): () => void {
  const detected = new Map<EvmProvider, DetectedWallet>();
  const publish = () =>
    onChange(
      [...detected.values()].sort((a, b) => a.name.localeCompare(b.name)),
    );
  const add = (value: unknown, name: string, id: string) => {
    if (value && typeof (value as EvmProvider).request === "function") {
      const provider = value as EvmProvider;
      if (!detected.has(provider))
        detected.set(provider, { id, name, provider });
    }
  };
  const globals = surface as unknown as Record<string, unknown>;
  const ethereum = globals.ethereum as
    | (EvmProvider & Record<string, unknown>)
    | undefined;
  const name = ethereum?.isRabby
    ? "Rabby"
    : ethereum?.isBraveWallet
      ? "Brave Wallet"
      : ethereum?.isCoinbaseWallet
        ? "Coinbase Wallet"
        : ethereum?.isMetaMask
          ? "MetaMask"
          : "Injected wallet";
  add(ethereum, name, "injected");
  if (Array.isArray(ethereum?.providers))
    ethereum.providers.forEach((p, index) =>
      add(
        p,
        (p as Record<string, unknown>).isMetaMask
          ? "MetaMask"
          : `Injected wallet ${index + 1}`,
        `injected-${index}`,
      ),
    );
  add(globals.okxwallet, "OKX Wallet", "okx");
  add(globals.rabby, "Rabby", "rabby");
  add(globals.coinbaseWalletExtension, "Coinbase Wallet", "coinbase");
  const announce = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (
      !detail?.info ||
      typeof detail.info.name !== "string" ||
      typeof detail.info.uuid !== "string"
    )
      return;
    if (detail.provider && typeof detail.provider.request === "function") {
      for (const [provider, old] of detected) {
        const fallback =
          ["injected", "okx", "rabby", "coinbase"].includes(old.id) ||
          old.id.startsWith("injected-");
        if (fallback && old.name === detail.info.name)
          detected.delete(provider);
      }
      detected.set(detail.provider, {
        id: detail.info.uuid,
        name: detail.info.name.slice(0, 80),
        provider: detail.provider,
      });
      publish();
    }
  };
  surface.addEventListener("eip6963:announceProvider", announce);
  publish();
  surface.dispatchEvent(new Event("eip6963:requestProvider"));
  return () =>
    surface.removeEventListener("eip6963:announceProvider", announce);
}

export const isAddress = (value: string): value is `0x${string}` =>
  /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value);
export const sameAddress = (a: string, b: string) =>
  Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
