# CoverWeave

CoverWeave is a permission-bundle workspace where GenLayer validators decide
whether two issuers' grants cover a buyer's goal, then the contract allocates a
fixed **2 GEN** purchase according to each grant's contribution.

[Live app](https://coverweave-genlayer.vercel.app) ·
[Deployed contract](https://explorer-studio-dev.genlayer.com/address/0xe4F0378799b47e7AE05F64d93dFE6590F68C5833) ·
[Lifecycle evidence](docs/evidence/studio-dev/lifecycle.md) ·
[CI](https://github.com/duclucky/coverweave-genlayer/actions/workflows/check.yml)

**Projects** submission: one `CoverWeave` Intelligent Contract and a React app
with seven pages for creating, reviewing, using and recovering agreements.

## What it solves

A buyer may need both permission to analyze a record and permission to export a
saved copy. Either grant alone can be insufficient. CoverWeave lets the buyer
and two issuers lock the goal and exact grant terms, ratify the same definition,
and ask GenLayer validators to evaluate A, B and A+B independently.

The protocol creates permissions through authenticated issuer transactions and
three-party assent. These are **protocol permissions**: they do not establish
external ownership, legal enforceability, identity or service delivery.

## How settlement works

`gl.vm.run_nondet_default` runs bounded web/model review with independent
semantic validation. Validators interpret the locked goal and grants using dated
W3C ODRL context. Contract code validates the normalized coverage vector,
rejects malformed or non-monotone results, and derives the outcome before any
value or permit changes.

| Coverage result | Issuer A | Issuer B | Buyer outcome |
| --- | --- | --- | --- |
| Both grants are needed together | 1 GEN | 1 GEN | One-use protocol permit |
| Either grant covers the goal alone | 1 GEN | 1 GEN | One-use protocol permit |
| Only A contributes sufficient permission | 2 GEN | 0 GEN | One-use protocol permit |
| Only B contributes sufficient permission | 0 GEN | 2 GEN | One-use protocol permit |
| Combined grants definitely do not cover the goal | 0 GEN | 0 GEN | 2 GEN refund credit |

Unavailable context or inconclusive judgment creates no payout and allows a
bounded retry. Expired pending purchases can be recovered. Credits remain
withdrawable; archiving requires zero liability. Withdrawals debit the ledger
and transfer native GEN through the verified EVM recipient boundary.

## Live App

[Open CoverWeave](https://coverweave-genlayer.vercel.app)

## Try the app

1. Open the [workspace](https://coverweave-genlayer.vercel.app/bundles) and inspect
   the archived agreement `cw-browser-complement-20261007-01` and its coverage
   history. The recovery example is `cw-browser-expiry-20261007-01`.
2. To create an agreement, select your installed EVM wallet in the wallet dialog.
   The app verifies or switches to **Studio Dev, chain 61997**. A new purchase
   requires **2 GEN**, plus network fees.
3. Enter the goal, two distinct issuer addresses and the offer, review and use
   deadlines. Each issuer offers its grant; the buyer and both issuers assent to
   the same locked definition before review.
4. Review coverage, then use the permit or recover an eligible purchase. Each
   credit owner withdraws their GEN before the agreement is archived.

The app shows submitted, accepted, finalized and failed states, then refreshes
canonical contract views. Available actions follow the connected role, state
and deadline. The account menu provides disconnect.

## Deployed Contract

Network: **Studio Dev** · Chain: **61997**

Contract: `0xe4F0378799b47e7AE05F64d93dFE6590F68C5833`

[Contract Explorer](https://explorer-studio-dev.genlayer.com/address/0xe4F0378799b47e7AE05F64d93dFE6590F68C5833)

## Verified evidence

| Verification | Result | Evidence |
| --- | --- | --- |
| Latest canonical accounting | 6 CLOSED bundles; 12 GEN received and withdrawn; zero liability and native balance | [Canonical read](docs/evidence/studio-dev/latest-canonical.json) |
| Successful finalized intelligent transactions | 50, excluding canceled/reverted attempts and native funding | [Lifecycle](docs/evidence/studio-dev/lifecycle.md) |
| Buyer wallet lifecycle | Purchase, assent, review, permit consumption and archive | [OKX buyer journal](docs/evidence/studio-dev/browser-wallet.json) |
| Buyer wallet recovery | Purchase, expired-purchase refund, exact 2 GEN native withdrawal and archive | [OKX recovery journal](docs/evidence/studio-dev/browser-recovery.json) |
| Issuer lifecycle | Offers, assents and withdrawals, script-signed | [Issuer journal](docs/evidence/studio-dev/browser-peers.json) |
| Local checks | 170 passing cases, zero skipped; lint, TypeScript and production build pass | [Local verification](docs/LOCAL-VERIFICATION.md) |

The canonical snapshot was read on **2026-10-07 at 07:26:30 UTC** and verifies
deployed source parity. Receipt journals retain unsuccessful attempts separately;
accepted and finalized timestamps come from server consensus records. Live
allocation, refund and withdrawal evidence is separate from local test coverage.

Local cases comprise 104 direct contract tests, 8 Python tooling tests, 26 Node
tooling tests, 1 local five-validator integration case, 14 frontend adapter/wallet
cases and 17 UI cases. GenVM lint recognizes one class with **9 writes and 8 views**.

## Run locally

Requirements: **Node.js 24**, **Python 3.12** and Git. From the repository root:

```powershell
py -3.12 -m venv .venv
$env:PYTHONUTF8 = "1"
.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
Copy-Item frontend/.env.example frontend/.env
```

Set `VITE_CONTRACT_ADDRESS` in ignored `frontend/.env` to the deployed contract
address above, then run:

```powershell
npm run check
npm run dev
```

Open the URL printed by Vite. The default `VITE_IC_RPC=/api/ic` uses the local
same-origin proxy. Canonical reads and fee profiling use the IC RPC path;
signed wallet transactions use Studio Dev's EVM-compatible provider path.
The proxy permits bounded public operations and projects safe response fields.
No private key belongs in frontend configuration.

## Repository and reusable interface

| Path | Purpose |
| --- | --- |
| [`contracts/coverweave.py`](contracts/coverweave.py) | Pinned GenVM contract, semantic review and GEN accounting |
| [`frontend/`](frontend/) | React product, wallet selection, transaction handling and canonical reads |
| [`shared/`](shared/) | Restricted same-origin IC RPC adapter |
| [`tests/`](tests/) | Direct, integration and tooling checks |
| [`scripts/`](scripts/) | Validation and resumable Studio Dev deployment/lifecycle tooling |
| [`docs/README.md`](docs/README.md) | Specification, state machine, safety cards and claim-to-proof mapping |
| [`docs/contract-schema.json`](docs/contract-schema.json) | Nine write methods and eight view methods |
| [`docs/evidence/studio-dev/`](docs/evidence/studio-dev/) | Sanitized deployment, receipt and accounting evidence |

Integrators can reuse keyed bundle, grant, attempt, permit and credit views
without forking the semantic judge. The MVP supports exactly two issuers, ASCII
grants and a fixed 2 GEN purchase. Review is capped at two attempts. The permit
is enforced inside the protocol; an external enforcement gateway is future work.
Studio Dev is the deployed network. Other coalition classes and semantic retry
have local test coverage in addition to the live branches linked above.

## Studio Dev deployment

For a separately authorized deployment or demo:

1. Run `npm run check`, review the source and commit it.
2. Configure authorized, distinct buyer and issuer keys in ignored `.env`.
   Never commit or log keys.
3. Run `node scripts/studio-inspect.mjs` and
   `node scripts/studio-run.mjs inspect` for read-only preflight.
4. Run `node scripts/studio-run.mjs deploy`. The driver profiles fees, journals
   broadcast hashes, verifies FINALIZED/SUCCESS and checks source/schema parity.
   Reruns recover saved references.
5. Run `node scripts/studio-run.mjs lifecycle`, followed by
   `node scripts/studio-enrich.mjs`, for the 2 GEN demo. The completed lifecycle
   proves permit consumption, native withdrawals and closure; its rerun reads
   closed state and performs zero writes.

The active identity journal binds source commit, SHA-256, runner/API, network
and address. Read [toolchain boundaries](docs/TOOLCHAIN.md) before investigating
runtime drift or receipts, and keep network evidence separate.

## Roadmap

A substantial next milestone would extend to three to five issuers with bounded
full-coalition evaluation and deterministic Shapley accounting, then add an
authenticated external permit consumer. Each increment requires its own
authority, lifecycle and value-destination proofs.
