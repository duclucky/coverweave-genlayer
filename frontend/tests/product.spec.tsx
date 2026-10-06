import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/App";
import type {
  Address,
  Bundle,
  Command,
  ContractAdapter,
} from "../src/lib/adapter";

// Test-only canonical-shaped fixtures. Never imported by the live product.
const buyer = "0x1111111111111111111111111111111111111111" as Address;
const a = "0x2222222222222222222222222222222222222222" as Address;
const b = "0x3333333333333333333333333333333333333333" as Address;
const now = Math.floor(Date.now() / 1000);
function fixture(overrides: Partial<Bundle> = {}): Bundle {
  return {
    id: "test-only",
    goal: "Analyze and export the registered record",
    buyer,
    grants: [
      { issuer: a, terms: "Analyze the record", assented: true },
      { issuer: b, terms: "Export the record", assented: true },
    ],
    buyerAssented: true,
    state: "READY",
    digest: "exact-definition",
    offerDeadline: now + 300,
    reviewDeadline: now + 600,
    useDeadline: now + 900,
    permit: "NONE",
    credits: {},
    attempts: [],
    ...overrides,
  };
}
function harness(
  bundle = fixture(),
  owner = buyer,
  route = "/bundles/test-only",
  overrides: Partial<ContractAdapter> = {},
) {
  const writes: Command[] = [];
  let reads = 0;
  Object.assign(window, {
    okxwallet: {
      request: async ({ method }: { method: string }) => {
        if (method !== "eth_requestAccounts")
          throw new Error("Unexpected wallet operation");
        return [owner];
      },
    },
  });
  const service: ContractAdapter = {
    ready: true,
    unavailableReason: "",
    async listBundles() {
      reads++;
      return [bundle];
    },
    async getBundle() {
      reads++;
      return bundle;
    },
    async transact(command, _wallet, onStatus) {
      writes.push(command);
      onStatus({ stage: "submitted" });
      onStatus({ stage: "accepted" });
      onStatus({ stage: "finalized" });
    },
    ...overrides,
  };
  render(
    <MemoryRouter initialEntries={[route]}>
      <App service={service} />
    </MemoryRouter>,
  );
  return { writes, reads: () => reads, user: userEvent.setup() };
}
async function connect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(screen.getByRole("banner")).getByRole("button", {
      name: "Connect wallet",
      exact: true,
    }),
  );
  await user.click(
    screen.getByRole("button", { name: "OKX Wallet", exact: true }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  delete (window as unknown as Record<string, unknown>).okxwallet;
});

describe("role journey and adapter boundary", () => {
  it("prepares the chosen wallet account before presenting it as connected", async () => {
    let prepared = "";
    const h = harness(fixture(), buyer, "/account", {
      async prepareWallet(wallet) { prepared = wallet.address; },
    });
    await connect(h.user);
    expect(prepared).toBe(buyer);
  });
  it("network check reports a real read result even when deployment is absent", async () => {
    let probes = 0;
    const h = harness(fixture(), buyer, "/account", {
      ready: false, unavailableReason: "Deployment pending",
      async probeNetwork() { probes++; },
    });
    await h.user.click(screen.getByRole("button", { name: "Check network" }));
    expect(await screen.findByText("Studio Dev is reachable.")).toBeTruthy();
    expect(probes).toBe(1);
    expect(screen.getByText("Deployment pending")).toBeTruthy();
  });
  it("timeout preserves submitted reference and resumes a read without another write", async () => {
    let writes = 0;
    let resumed = "";
    const hash = "0x" + "aa".repeat(32);
    const h = harness(fixture(), buyer, "/bundles/test-only", {
      async transact(_command, _wallet, onStatus) {
        writes++;
        onStatus({ stage: "timeout", hash });
        throw Object.assign(new Error("Confirmation pending"), { name: "PendingTransactionError", hash });
      },
      async resumeTransaction(_wallet, reference, onStatus) {
        resumed = reference;
        onStatus({ stage: "finalized", hash: reference });
      },
    });
    await screen.findByText("What each issuer offers");
    await connect(h.user);
    const before = h.reads();
    await h.user.click(screen.getByRole("button", { name: "Check coverage" }));
    expect(await screen.findByText("Still awaiting confirmation")).toBeTruthy();
    await h.user.click(screen.getByRole("button", { name: "Check confirmation" }));
    await waitFor(() => expect(h.reads()).toBeGreaterThan(before));
    expect(writes).toBe(1);
    expect(resumed).toBe(hash);
  });
  it("buyer reviews exact creation terms, then finalization navigates to canonical detail", async () => {
    const h = harness(fixture(), buyer, "/bundles/new");
    await connect(h.user);
    await h.user.type(screen.getByLabelText("Agreement ID"), "test-only");
    await h.user.type(
      screen.getByLabelText("Your exact goal"),
      "Analyze and export the registered record",
    );
    await h.user.type(screen.getByLabelText("Issuer A wallet"), a);
    await h.user.type(screen.getByLabelText("Issuer B wallet"), b);
    await h.user.click(screen.getByRole("button", { name: "Review terms" }));
    expect(
      screen.getByRole("heading", { name: "Review your purchase" }),
    ).toBeTruthy();
    await h.user.click(
      screen.getByRole("button", { name: "Reserve 2 GEN & create" }),
    );
    await waitFor(() => expect(h.writes).toHaveLength(1));
    expect(h.writes[0].method).toBe("open_bundle");
    if (h.writes[0].method === "open_bundle")
      expect(h.writes[0].input).toMatchObject({
        id: "test-only",
        goal: "Analyze and export the registered record",
        issuerA: a,
        issuerB: b,
      });
    expect(await screen.findByText("What each issuer offers")).toBeTruthy();
  });
  it("renders actual coverage and exact grant history from the adapter", async () => {
    harness(
      fixture({
        state: "PURCHASED",
        permit: "CONSUMED",
        attempts: [
          {
            index: 0,
            classes: ["INCOMPLETE", "INCOMPLETE", "COMPLETE"],
            state: "PURCHASED",
            timestamp: now,
          },
        ],
      }),
    );
    expect(await screen.findByText("Goal covered")).toBeTruthy();
    expect(screen.getAllByText("Part missing")).toHaveLength(2);
  });
  const cases: [string, Address, Partial<Bundle>, Command["method"], string][] =
    [
      [
        "assent",
        buyer,
        { state: "OPEN", buyerAssented: false },
        "ratify_bundle",
        "Accept this agreement",
      ],
      ["review", buyer, {}, "review_bundle", "Check coverage"],
      ["retry", a, { state: "RETRYABLE" }, "review_bundle", "Retry coverage"],
      [
        "use permit",
        buyer,
        { state: "PURCHASED", permit: "AVAILABLE" },
        "consume_permit",
        "Use permission",
      ],
      [
        "refund expiry",
        buyer,
        { state: "OPEN", reviewDeadline: now - 1 },
        "refund_expired",
        "Recover purchase",
      ],
      [
        "expire permit",
        buyer,
        { state: "PURCHASED", permit: "AVAILABLE", useDeadline: now - 1 },
        "expire_permit",
        "Expire unused permission",
      ],
      [
        "withdraw share",
        a,
        { state: "PURCHASED", permit: "CONSUMED", credits: { [a]: "1" } },
        "withdraw_credit",
        "Withdraw my GEN",
      ],
      [
        "close",
        buyer,
        { state: "REFUNDED" },
        "close_bundle",
        "Archive agreement",
      ],
    ];
  for (const [job, owner, state, method, label] of cases)
    it(`${job} sends exact command and reloads canonical state after finalization`, async () => {
      const h = harness(fixture(state), owner);
      await screen.findByText("What each issuer offers");
      await connect(h.user);
      const baseline = h.reads();
      await h.user.click(
        screen.getByRole("button", { name: label, exact: true }),
      );
      await waitFor(() => expect(h.writes).toHaveLength(1));
      expect(h.writes[0].method).toBe(method);
      expect("id" in h.writes[0] && h.writes[0].id).toBe("test-only");
      if (method === "ratify_bundle")
        expect(h.writes[0]).toEqual({
          method,
          id: "test-only",
          digest: "exact-definition",
        });
      await waitFor(() => expect(h.reads()).toBeGreaterThan(baseline));
    });
  it("issuer offers only its own exact terms through the typed boundary", async () => {
    const row = fixture({
      state: "OPEN",
      grants: [
        { issuer: a, terms: "", assented: false },
        { issuer: b, terms: "Export", assented: false },
      ],
    });
    const h = harness(row, a);
    await screen.findByText("What each issuer offers");
    await connect(h.user);
    await h.user.type(
      screen.getByLabelText("Your permission"),
      "Analyze the registered record.",
    );
    await h.user.click(
      screen.getByRole("button", { name: "Offer my permission" }),
    );
    await waitFor(() =>
      expect(h.writes[0]).toEqual({
        method: "offer_grant",
        id: "test-only",
        terms: "Analyze the registered record.",
      }),
    );
  });
  it("logout removes eligible write controls and leaves canonical history readable", async () => {
    const h = harness();
    await screen.findByText("What each issuer offers");
    await connect(h.user);
    expect(screen.getByRole("button", { name: "Check coverage" })).toBeTruthy();
    await h.user.click(
      within(screen.getByRole("banner")).getByText("0x1111…1111"),
    );
    await h.user.click(
      screen.getByRole("button", { name: "Disconnect wallet" }),
    );
    expect(screen.queryByRole("button", { name: "Check coverage" })).toBeNull();
    expect(screen.getByText("What each issuer offers")).toBeTruthy();
    expect(h.writes).toHaveLength(0);
  });
  it("configured read failure is an error with retry, not a fabricated empty agreement", async () => {
    const service: ContractAdapter = {
      ready: true,
      unavailableReason: "",
      async listBundles() {
        throw new Error("Read unavailable");
      },
      async getBundle() {
        throw new Error("Read unavailable");
      },
      async transact() {
        throw new Error("No writes");
      },
    };
    render(
      <MemoryRouter initialEntries={["/bundles/test-only"]}>
        <App service={service} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Read unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByText("What each issuer offers")).toBeNull();
  });
});
