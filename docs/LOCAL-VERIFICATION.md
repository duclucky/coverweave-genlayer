# Local verification, updated 2026-10-07

This file records local evidence only. Live Studio evidence is recorded separately
under `evidence/studio-dev/`. Browser-wallet signing remains separately unproven.

## Contract and toolchain

Command: `.venv\Scripts\genvm-lint.exe check contracts/coverweave.py`

Observed output:

```text
Lint passed (3 checks)
Validation passed
Contract: CoverWeave
Methods: 17 (8 view, 9 write)
```

Command: `.venv\Scripts\genvm-lint.exe typecheck contracts/coverweave.py --json`

Observed output: `ok: true`, `diagnostics: []`; errors, warnings, info all 0.
ASCII header and single class/payable metadata are separately asserted by tests.

## Full local check

Command: `npm run check`

Observed final result: exit 0.

```text
112 passed in 22.57s
tooling node tests: 26 passed, 0 failed, 0 skipped
LOCAL ONLY: five simulated validators agree on the canonical coalition vector
1 passed in 1.32s
frontend node tests: 14 passed, 0 failed, 0 skipped
frontend component tests: 17 passed
tsc --noEmit: success
Vite 8.3.3 production build: completed
```

There are 170 executed local cases. Tests include deterministic settlement
invariants, independent semantic replay, malformed/extra output, all coalition
consequences, non-penalizing retry, exact deadline boundaries with stale phase,
wrong actor/entity/objective/network/policy bindings, isolation, duplicate
writes, recovery, perpetual credit withdrawal, payable metadata and zero liability.
UI fixture tests prove wrappers, contextual controls and finalization reload
behavior only; they are not evidence of a real browser transaction.
The provider-rejection regression first failed on missing recovery feedback, then
passed after EIP-1193 code 4001 was mapped to explicit account-access guidance.
It proves that rejected access never presents a connected account or starts a write.

## Frontend integration verification

The real-SDK fee regression first failed because the signed envelope omitted
the profiler's fee deposit. The adapter now profiles the exact write with
`estimateTransactionFeesForWrite` and supplies the resulting fees. The proxy
binds profiling to the active contract, permits only its nine write names and
exact 2-GEN/zero-GEN value, supplies canonical chain time, and returns only the
recommended public fee preset. It never forwards a raw simulation receipt.
A separate regression reproduced indefinite pending after a reverted EVM
envelope, then passed after read-only confirmation recognized `status 0x0`.
The compiled production-entry regression also passes with the pinned SDK.
Production profiling then exposed Studio's case-sensitive contract lookup:
lowercase destination returned contract-missing, while the exact checksum
deployment address produced a fee preset. The proxy now preserves that spelling;
its regression reproduced the failure before the correction. No transaction was
sent by either profiler probe.

The current in-app browser blocks both localhost and loopback URLs with
`ERR_BLOCKED_BY_CLIENT`. Earlier Chrome local canonical-read proof remains
historical; this revision's in-app local browser check is not claimed as passed.
Production browser verification remains separately required.

Commands: `node --test frontend/tests/sdk-adapter.test.mjs` and
`node --test tests/tooling/sdk-wallet-preflight.test.mjs`.

Observed: 6 project-adapter cases and 3 current-SDK canary cases passed.
The actual installed SDK encodes every write using the selected provider;
purchases carry exactly 2 GEN and other writes carry zero GEN. SDK address
normalization, both issuer-address encodings, wallet/IC traffic separation,
changed-account rejection, switch/add verification, latest-final reads and
pending confirmation without rebroadcast are asserted. These tests intercept
I/O and are not real signing, fee, balance or Studio execution evidence.

Commands: `node --test tests/tooling/proxy.test.mjs` and browser account-page
interaction `Check network` at `http://127.0.0.1:5179/account`.

Observed: 5 proxy cases passed, including object/array receipt shapes, rejection
of broadcasting/admin/signature methods, a fixed Studio Dev upstream and
removal of private config/log/error data. Chrome displayed **Studio Dev is
reachable.** after the actual same-origin SDK chain read. Missing contract
configuration remained visibly unavailable. This proves the browser RPC path,
not deployed contract reads or wallet writes. No accounts were requested.

Command: `npm run test:integration` (cold local server)

Observed output: five simulated validators agree; `1 passed in 4.38s`; exit 0.
The server is started and stopped by the test runner. Mocks must be installed
before writes. Toolchain adaptations and limitations are in TOOLCHAIN.md.

The receipt regression initially returned 7 failed/2 passed against a false
success stub; those 9 pass. A tenth test covers the current Studio leader/vote
receipt distinction. Nonpayable write guards likewise had 8 meaningful
failing cases before their implementation. Successful accepted/finalized status
is always checked separately from successful contract execution.

Standalone command: `.venv\Scripts\gltest.exe tests/ --tb=short -q`.
Observed after the loopback-default/owned-fixture repair: `113 passed in 27.05s`.
No Studio RPC writes are used by local tests. The scenario recovery tests also
prove original IDs/deadlines survive a rerun and recovery follows actual
canonical credits, including an unexpected but valid settled vector.

## Four-source authority audit, 2026-10-07

Sources cross-checked: the exact deployed `contracts/coverweave.py`, current
170-case check output, safe Studio journal/canonical views, and README/spec/UI
claims. One recognized contract has nine writes and eight views. The deployed
source hash and method count match; no replacement runtime or address is used.

| Authority-matrix row | Deterministic and semantic trace | Negative proof | Canonical/live evidence |
| --- | --- | --- | --- |
| Buyer goal and roles | `open_bundle` fixes sender, unique entity, three roles, exact 2 GEN and strict ordered deadlines; `_definition` binds network, address, entity, policy and goal | `test_open_requires_exact_purchase_and_unique_id`, `test_invalid_roles_cannot_accept_purchase`, eight `test_valid_hash_wrong_canonical_binding_rejected` variants; unchanged accounting | `get_bundle`, `get_accounting`; distinct authenticated actors and 2-GEN deposits in the safe Studio journal |
| Issuer constitutive grants | `offer_grant` authenticates exact issuer slot, rejects overwrite and late input; definition is recomputed before ratification/review; prose has no payee/amount authority | `test_authentic_bytes_from_stranger_cannot_offer_or_assent`, isolation, wrong-slot binding, injection containment | `get_grant`, `get_bundle`; actual immutable A/B offers before network review |
| Three-party assent | `ratify_bundle` requires membership, both grants, exact complete digest, unset own flag and own clock gate; review requires assents=7 | wrong actor/entity/version/network/deadline digests, duplicate assent and stale-phase boundary tests | Canonical assents=7 in complementary and no-cover cases, each with three actor-signed transactions |
| Semantic consequence | `review_bundle` calls `run_nondet_default(leader, validator)`; validator independently replays exact authenticated terms; `_result` validates context, fixed three classes and monotonicity before `_allocate`; code alone derives shares/permit/refund | `test_fixed_consequence_and_independent_validator`, malformed/extra/non-monotone output, forced invalid accepted result and unavailable context; rejection preserves state or explicitly allowed RETRYABLE without credit/permit | `get_attempt`, credits, permit and accounting; live I/I/C yields 1/1 GEN and consumed permit; I/I/I yields buyer refund; exact native withdrawals and closure |
| Dated external context | `_semantic_judgment` fetches only the fixed W3C dated URL, bounds content and checks status/version; context explains terminology and authenticates no external ownership/work | wrong version, 503, empty context produce non-penalizing RETRYABLE; caller cannot select another origin | Live attempts have context_ok=true; source outage and retry limits have local negative proof only |

The prose-injection test uses mocked semantic output: it proves deterministic
containment and unchanged locked authority, not immunity of a real model to all
injections. Root-cause/dependency classification is outside this coalition schema;
invalid coverage/classes and conservation are the relevant settlement invariants.
No authenticated external ownership, service delivery or usage is claimed.
Browser read proof and script-signed network writes remain distinct. All nine UI
actions have wrapper/control/test/finality/reload paths, but actual browser-wallet
execution remains pending and blocks Projects completion and submission.
