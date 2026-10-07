# CoverWeave

CoverWeave uses GenLayer validators to judge combined protocol permissions and split a fixed GEN purchase by each issuer's semantic contribution.

Category: **Projects**. One `CoverWeave` Intelligent Contract and seven product
pages: welcome, workspace, creation, agreement detail, credits, guide and account.

## Problem and trust boundary

Two permission issuers and a buyer can disagree about whether each grant, or both
together, covers an agreed goal. A fixed 2-GEN purchase removes arbitrary payout
requests. All three actors ratify the same canonical definition. GenLayer validators
judge A, B and A+B semantically, rather than accepting an operator's score.

A signed grant creates a permission **inside this protocol**. It does not prove
external ownership, legal enforceability, identity, generated work or delivery.
The contract cannot authenticate those external claims and does not rely on them.

## Architecture and consequence

The contract locks actor roles, objective, grants, deadlines and a digest binding
the exact protocol definition. `gl.vm.run_nondet_default` runs bounded web/model
review and independent semantic validation. Deterministic settlement checks reject
malformed output, invalid coalition classes and non-monotone coverage before value
or access changes. Missing context or inconclusive evidence remains retryable.

Complete joint coverage grants a one-use protocol permit and credits issuers with
the two-player cooperative split: complementary or substitutable grants earn
1 GEN each; a redundant grant earns 0 GEN and the necessary issuer earns 2 GEN.
A definite coverage gap refunds the buyer's 2 GEN. Expiry provides recovery, credits
remain withdrawable, and archive requires zero liability. Native withdrawals use
the verified EVM recipient boundary after ledger debit.

The React frontend reads canonical views through a same-origin IC RPC proxy.
An EIP-6963/injected wallet picker lets users select their EVM provider. Wallet
writes use Studio Dev's EVM-compatible path; the IC proxy accepts public reads
only and strips private RPC configuration and logs. Actions depend on role, state
and time. Confirmation distinguishes submitted, accepted, finalized and failure,
then reloads canonical state. Disconnect disables writes.

## Deployed Contract

Network: **Studio Dev**, chain 61997.

Address: `0xe4F0378799b47e7AE05F64d93dFE6590F68C5833`

[Contract Explorer](https://explorer-studio-dev.genlayer.com/address/0xe4F0378799b47e7AE05F64d93dFE6590F68C5833)

## Live App

[Open CoverWeave](https://coverweave-genlayer.vercel.app)

Production is verified: HTTP 200, project title and React root, plus actual
canonical agreement reads through the deployed same-origin API proxy.

## Verified evidence

- [Finalized Studio lifecycle](docs/evidence/studio-dev/lifecycle.md): 12 transactions,
  live I/I/C judgment, 1 GEN per issuer, consumed permit, exact native withdrawals,
  CLOSED and zero liability/native balance. All accepted/finalized timestamps are
  server consensus timestamps; all source and transaction references are in the
  [safe journal](docs/evidence/studio-dev/deployment.json).
- [Local verification](docs/LOCAL-VERIFICATION.md): 170 passing cases, zero skipped;
  104 direct contract tests, eight Python tooling tests, 26 node tooling tests,
  one local five-validator integration case, 14 frontend adapter/wallet cases
  and 17 UI cases. GenVM lint recognizes one class and 17 methods; TypeScript
  and production build pass.
- Chrome local and production frontends read the actual archived agreement, its
  grants and coverage through the same-origin proxy. This is browser **read** proof.
  An OKX-signed envelope reverted before contract execution; a successful browser
  lifecycle remains pending. Script signing is separate.
- [Public CI passed](https://github.com/duclucky/coverweave-genlayer/actions/runs/37491951797)
  at commit `f27199c`; later revisions require their own successful run.
  External adoption remains pending.

## Run locally

Requirements: Node.js 24, Python 3.12 and Git. Create `.venv`, then install the
pinned official dependencies and workspace packages:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
npm run check
Copy-Item frontend/.env.example frontend/.env
npm run dev
```

Set the public `VITE_CONTRACT_ADDRESS` in ignored `frontend/.env` to the deployed
address. No private key belongs in the frontend. The dev command serves the full
product; use an installed EVM wallet selected from its wallet dialog.

## Studio Dev deployment

1. Run `npm run check` with `PYTHONUTF8=1`; review the source and commit it.
2. Configure the three authorized actor keys in ignored `.env`; the current
   driver requires distinct buyer and issuer accounts. Never commit or log keys.
3. Run `node scripts/studio-inspect.mjs` and `node scripts/studio-run.mjs inspect`.
   They verify chain, existing actors and deployment identity without writes.
4. Run `node scripts/studio-run.mjs deploy`. The driver profiles exact fees,
   records each broadcast hash before submission, and verifies FINALIZED/SUCCESS,
   deployed source parity and schema. It recovers saved references on rerun.
5. For an explicitly authorized 2-GEN demo, run
   `node scripts/studio-run.mjs lifecycle`, then `node scripts/studio-enrich.mjs`.
   The lifecycle consumes the permit, withdraws both credits and proves closure.
   A completed rerun reads the closed state and performs zero writes.

The active deployment binds source commit, SHA-256, runner/API, network and address.
Do not edit or replay its identity journal to create a new revision. Keep network
evidence separate. Read [toolchain boundaries](docs/TOOLCHAIN.md) before diagnosing
runtime drift, receipts or simulation behavior.

## Reusable interface and limits

Integrators use nine role-authorized writes and eight canonical views described in
the [specification](docs/README.md). The frontend exposes every product lifecycle
action with finality and reload handling; its tests are not substitutes for real
browser signing. Retry is capped at two reviews and failed evidence cannot pay.

The MVP supports exactly two issuers, ASCII grants and a fixed 2-GEN purchase.
Complementary and dummy allocation, no-cover refund and pending-purchase expiry recovery
have live network proof, including native withdrawals and closure. Other coalition
classes, semantic retries and adversarial rejection have local test proof. The permit has no
external enforcement gateway. ODRL workspaces, permission brokers and DAO access
flows are proposed consumers, not adoption claims. Studio Dev is the only deployed
network. The frontend bundle-size warning remains a performance limitation.

## Next milestone

A substantial next increment would support three to five issuers with bounded full
coalition evaluation and deterministic Shapley accounting, then integrate one
authenticated external permit consumer with actual end-to-end usage evidence.
That requires new authority, lifecycle and value-destination proofs.
