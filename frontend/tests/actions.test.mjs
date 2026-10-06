import test from "node:test";
import assert from "node:assert/strict";
import { availableActions } from "../src/lib/adapter.ts";
const buyer = "0x1111111111111111111111111111111111111111";
const a = "0x2222222222222222222222222222222222222222";
const b = "0x3333333333333333333333333333333333333333";
const bundle = {
  id: "one",
  goal: "Analyze and export",
  buyer,
  grants: [
    { issuer: a, terms: "", assented: false },
    { issuer: b, terms: "", assented: false },
  ],
  buyerAssented: false,
  state: "OPEN",
  digest: "bound",
  offerDeadline: 10,
  reviewDeadline: 20,
  useDeadline: 30,
  permit: "NONE",
  credits: {},
  attempts: [],
};
test("offer belongs only to exact issuer, before deadline even with stale phase", () => {
  assert.deepEqual(availableActions(bundle, a, 9), ["offer_grant"]);
  assert.deepEqual(availableActions(bundle, buyer, 9), []);
  assert.deepEqual(availableActions(bundle, a, 10), []);
  assert.deepEqual(availableActions(bundle, a, 11), []);
});
test("refund is buyer-only at expiry, and never for purchased bundles", () => {
  assert.deepEqual(availableActions(bundle, buyer, 20), ["refund_expired"]);
  assert.deepEqual(availableActions(bundle, a, 20), []);
  assert.deepEqual(
    availableActions(
      { ...bundle, state: "PURCHASED", permit: "AVAILABLE" },
      buyer,
      20,
    ),
    ["consume_permit"],
  );
});
test("purchased issuer can withdraw own credit; buyer cannot archive liability", () => {
  const purchased = {
    ...bundle,
    state: "PURCHASED",
    permit: "CONSUMED",
    credits: { [a]: "1", [b]: "1" },
  };
  assert.deepEqual(availableActions(purchased, a, 40), ["withdraw_credit"]);
  assert.deepEqual(availableActions(purchased, buyer, 40), []);
  assert.deepEqual(availableActions({ ...purchased, credits: {} }, buyer, 40), [
    "close_bundle",
  ]);
});
test("permit use stops at equality; expiry then becomes the buyer recovery action", () => {
  const purchased = { ...bundle, state: "PURCHASED", permit: "AVAILABLE" };
  assert.deepEqual(availableActions(purchased, buyer, 29), ["consume_permit"]);
  assert.deepEqual(availableActions(purchased, buyer, 30), ["expire_permit"]);
  assert.deepEqual(availableActions(purchased, a, 30), []);
});
