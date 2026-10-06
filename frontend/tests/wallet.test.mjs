import test from "node:test";
import assert from "node:assert/strict";
import { discoverWallets } from "../src/lib/wallet.ts";

test("discovers injected wallets without requesting accounts or auto-selecting", () => {
  const surface = new EventTarget();
  let requests = 0;
  const okx = {
    request: async () => {
      requests++;
    },
  };
  const rabby = {
    request: async () => {
      requests++;
    },
    isRabby: true,
  };
  surface.okxwallet = okx;
  surface.ethereum = rabby;
  let detected = [];
  const stop = discoverWallets(surface, (wallets) => {
    detected = wallets;
  });
  assert.deepEqual(detected.map((x) => x.name).sort(), ["OKX Wallet", "Rabby"]);
  assert.equal(requests, 0);
  stop();
});

test("EIP-6963 announcements deduplicate provider identity and stop after cleanup", () => {
  const surface = new EventTarget();
  const provider = { request: async () => [] };
  surface.ethereum = provider;
  let detected = [];
  const stop = discoverWallets(surface, (wallets) => {
    detected = wallets;
  });
  const announce = () =>
    surface.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: {
          info: {
            uuid: "wallet-1",
            name: "Named Wallet",
            rdns: "wallet.example",
          },
          provider,
        },
      }),
    );
  announce();
  assert.equal(detected.length, 1);
  assert.equal(detected[0].name, "Named Wallet");
  stop();
  surface.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: { uuid: "wallet-2", name: "Other" },
        provider: { request: async () => [] },
      },
    }),
  );
  assert.equal(detected.length, 1);
});

test("EIP-6963 replaces the same-brand injected fallback, even with a different wrapper", () => {
  const surface = new EventTarget();
  surface.okxwallet = { request: async () => [] };
  let detected = [];
  const stop = discoverWallets(surface, (wallets) => {
    detected = wallets;
  });
  surface.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: { uuid: "official-okx", name: "OKX Wallet" },
        provider: { request: async () => [] },
      },
    }),
  );
  assert.equal(detected.length, 1);
  assert.equal(detected[0].id, "official-okx");
  stop();
});
