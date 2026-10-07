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
112 passed in 25.32s
tooling node tests: 25 passed, 0 failed, 0 skipped
LOCAL ONLY: five simulated validators agree on the canonical coalition vector
1 passed in 1.38s
frontend node tests: 13 passed, 0 failed, 0 skipped
frontend component tests: 17 passed
tsc --noEmit: success
Vite 8.3.3 production build: completed
```

There are 168 executed local cases. Tests include deterministic settlement
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
