# Frontend baseline

Local verification only. No deployment, GEN flow or finalized validator evidence.

Seven product routes: Welcome, Workspace, New bundle, Bundle detail, My credits,
Guide, Account; explicit not-found recovery. Persistent navigation and deep
links. Buyer journey includes a two-step retained-input purchase review; detail
offers context-sensitive controls and history; returning participants search
and filter agreements and recover credits. All nine planned writes have typed
adapter commands and UI controls. Contract connection remains unavailable until
real SDK integration; no fixture is imported by live source.

Commands: npm run check (20 tests: 7 node logic + 13 Vitest component cases,
TypeScript, Vite production build); node tests observed failing wallet/action
cases before implementation, including same-brand injected/EIP-6963 duplication.
Component tests use explicitly test-only fixtures, not network evidence.
Tests verify each exact command and canonical reload after test finalization,
actual grant/coverage rendering, read failure and logout disabling writes.

Chrome local browser inspected every route, empty/configuration states,
invalid-form inline errors and focused summary, review terms, native wallet
picker and accurate detected wallet names. Duplicate OKX fixed and reverified
after fresh reload. No account request was made during baseline inspection.
375/768/1440 viewport checks: no horizontal overflow; 360/753/1425 client widths
equal scroll widths (scrollbar excluded). Overrides reset after checks.
Font actual: Plus Jakarta Sans. Reduced-motion transition actual: 0s; emulated
media reset. Color contrast against white: blue 5.93:1, navy 17.85:1, muted
7.58:1, destructive 4.83:1. Light theme only; no dark-theme claim.

Visual baseline: DESIGN.md tokens, route map and hierarchy. SDK wiring must
preserve these pages; permitted changes are data/role/finality/error behavior.
Source was formatted for maintainability. Private keys, raw validator output,
system storage and reviewer/submission material are excluded from product UI.

Still required: real SDK/wallet regression, browser-local IC RPC proof, deployed
address, real wallet signatures, actual finalized lifecycle and GEN balance
proof. Local adapter tests cannot establish any of those requirements.
