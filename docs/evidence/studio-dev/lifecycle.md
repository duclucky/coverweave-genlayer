# Studio Dev consequential lifecycle

Verified on 2026-10-06. Network: Studio Dev, chain 61997. One active deployment:
`0xe4F0378799b47e7AE05F64d93dFE6590F68C5833`.

[Contract Explorer](https://explorer-studio-dev.genlayer.com/address/0xe4F0378799b47e7AE05F64d93dFE6590F68C5833)

Commands: `node scripts/studio-run.mjs deploy`,
`node scripts/studio-run.mjs lifecycle`, `node scripts/studio-enrich.mjs`.

Observed: 12 recorded transactions FINALIZED with execution SUCCESS. The safe
[deployment journal](deployment.json) binds the exact source commit, SHA-256,
runner/API, addresses, public actors, transaction links, server accepted/finalized
timestamps, and canonical before/after views. Source parity and all 17 deployed
methods were verified. Observation times are stored separately from server time.
No wallet material, raw receipts, validator configuration or execution logs are
included. Three existing authorized actors were used; no account funding occurred.

## Live judgment and consequence

Bundle `cw-studio-complement-20261006-01` purchased with 2 GEN. The goal asks for
analysis and saved export; issuer A grants analysis and issuer B grants export.
Each signed offer constitutes a permission inside this protocol. All three actors
ratified the same digest before review. These are not claims of external ownership,
delivery, legal rights or authenticated generated work.

Actual canonical `get_attempt` output:

```json
{"classes":["INCOMPLETE","INCOMPLETE","COMPLETE"],"context_ok":true,"index":0,"outcome":"PURCHASED"}
```

The onchain semantic review used live W3C ODRL context and model execution,
with independent semantic validation. Contract code derived the coalition value
and credited 1 GEN to each issuer. It granted the buyer a one-use protocol permit,
which the buyer consumed. Review finalized at `2026-10-06T15:20:01.333Z`.

## Native transfer and closure proof

| Step | Native contract balance before | After | Exact decrease | Recipient net increase |
| --- | --- | --- | --- | --- |
| Issuer A withdrawal | 2 GEN | 1 GEN | 1 GEN | 0.999873694249999177 GEN |
| Issuer B withdrawal | 1 GEN | 0 GEN | 1 GEN | 0.999873694499999177 GEN |

The recipient net increase includes its transaction fee. Native contract decrease
matches the exact credit release; a finalized parent and zero credit alone were
not accepted as transfer proof. Both `nativeTransferVerified` records are true.
Final `get_bundle` status is CLOSED, permit CONSUMED. Final `get_accounting`:

```json
{"credits_gen":"0","exists":true,"liability_gen":"0","locked_gen":"0","received_gen":"2","withdrawn_gen":"2"}
```

Close finalized at `2026-10-06T15:23:42.622Z`. Native contract balance: 0 GEN.

## Proof boundaries

This lifecycle was signed by scripts using authorized existing EOAs. It does not
prove a browser-wallet write. Browser signing, hosted reads and external adoption
are separate evidence items. The local negative tests cover all nine write methods,
temporal boundaries, retry, gap/refund, and invalid semantic output; those local
cases are not additional live Studio transactions. No external gateway currently
consumes this protocol permit.
