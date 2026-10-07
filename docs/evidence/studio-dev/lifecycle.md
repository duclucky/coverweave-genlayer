# Studio Dev consequential lifecycle

Verified on 2026-10-06, recovery evidence added 2026-10-07. Network: Studio Dev,
chain 61997. One active deployment:
`0xe4F0378799b47e7AE05F64d93dFE6590F68C5833`.

[Contract Explorer](https://explorer-studio-dev.genlayer.com/address/0xe4F0378799b47e7AE05F64d93dFE6590F68C5833)

Commands: `node scripts/studio-run.mjs deploy`,
`node scripts/studio-run.mjs lifecycle`, `node scripts/studio-enrich.mjs`.

The original lifecycle has 12 recorded transactions FINALIZED with execution
SUCCESS. Expiry and no-cover recovery add 13 verified transactions, and dummy
allocation adds 10. The safe receipt summary is **Status: FINALIZED; Result:
SUCCESS** for these 35 transactions.
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

## No-cover and expiry recovery

Commands: `node scripts/studio-run.mjs lifecycle expiry`,
`node scripts/studio-run.mjs lifecycle gap`, then read-only
`node scripts/studio-enrich.mjs` (`enrichedTransactions: 25`, `writesPerformed: 0`).

| Scenario | Canonical judgment/recovery | Native before / after buyer withdrawal | Exact decrease | Recipient net increase | Final state |
| --- | --- | --- | --- | --- | --- |
| `cw-studio-expiry-20261007-01` | Pending agreement passed canonical review deadline; buyer called `refund_expired` | 2 / 0 GEN | 2 GEN | 1.999873694499999177 GEN | CLOSED, zero liability |
| `cw-studio-gap-20261007-01` | Actual I/I/I, context_ok=true, attempt 0 REFUNDED | 2 / 0 GEN | 2 GEN | 1.999873694499999177 GEN | CLOSED, zero liability |

Both final `get_accounting` views show received=withdrawn=2 GEN and
locked=credits=liability=0 GEN. Each native transfer is independently verified;
recipient net increase includes its transaction fee. No funding occurred.
The expiry driver rerun recovered the saved CLOSED state with zero writes.

The gap goal requires reading the record and deleting its archived copy. A
grants reading and B grants export, so the actual live review found no coalition
covers deletion. All three parties first ratified the complete definition.
Review transaction
`0xbe1f6ac65c9d26fd12c55fa9c82f91bdc24343839f48bb470215abb4ca5b391a`
initially exposed an intermediate PROPOSING/ERROR observation. The driver
stopped, and read-only inspection subsequently proved this same transaction
FINALIZED/SUCCESS with a canonical refund. No duplicate review was sent.
The journal retains the intermediate observation separately; only the actual
final receipt and state authorize recovery. Buyer withdrew and archived.
Gap close finalized `2026-10-07T00:46:32.280Z`; expiry close finalized
`2026-10-07T00:37:12.330Z`. Safe transaction links and server times are in the journal.

## Dummy issuer receives zero GEN

Command: `node scripts/studio-run.mjs lifecycle dummy`.
Bundle `cw-studio-dummy-20261007-01` uses the goal "Analyze AND export the
registered record." A grants both actions; B grants dashboard background-color
changes. All three actors ratified this exact definition before live review.
Actual `get_attempt` output is C/I/C, context_ok=true, index=0, PURCHASED.
No expectation vector was supplied to the contract or model as a verdict.

Contract rules credited A with 2 GEN and B with 0 GEN. Buyer consumed the
one-use permit. A's withdrawal decreased native contract balance exactly
2 GEN, from 2 to 0 GEN, and its net balance increased
1.999873694249999177 GEN after the transaction fee. No zero-credit withdrawal
was attempted for B. Final canonical state is CLOSED, permit CONSUMED;
received=withdrawn=2 GEN, locked=credits=liability=0 GEN, native balance=0 GEN.
Chrome read the same live terms, C/I/C coverage and 2/0-GEN remaining credits
through the production adapter before withdrawal; browser signing remains distinct.
Close finalized `2026-10-07T01:00:49.966Z`. A subsequent read-only enrichment
verified all 35 receipts and their server accepted/finalized timestamps, with
zero writes. Rerunning each of the four lifecycle commands recovered CLOSED
state and printed `writesPerformed: 0`.

Fresh `get_global_accounting` at LATEST_FINAL and native `eth_getBalance` showed
four bundles, received=withdrawn=8 GEN, locked=credits=liability=0 GEN, and native
balance=0 GEN. The same read verified exact deployed source parity again.
This observation is saved as `latestCanonicalVerification` in the safe journal;
it is an observation time, not a transaction's server finalization time.

## Proof boundaries

This lifecycle was signed by scripts using authorized existing EOAs. It does not
prove a browser-wallet write. Browser signing and hosted reads are separate
evidence items. The local negative tests cover all nine write methods,
temporal boundaries, retry and invalid semantic output; those local cases are
not additional live Studio transactions. Gap/refund and pending expiry now have
the separate real transactions documented above. No external gateway currently
consumes this protocol permit.

## In-app buyer lifecycle, 2026-10-07

Bundle `cw-browser-complement-20261007-01` used an OKX buyer in the Codex
in-app browser. The frontend prepared all five buyer writes; the owner signed
each in the extension: purchase 2 GEN, assent, review, use and archive.
All five finalized successfully; the UI reloaded canonical state after each.
The review returned I/I/C with context_ok=true, giving each issuer 1 GEN and
the buyer one protocol use. The final bundle is CLOSED, permit CONSUMED,
received=withdrawn=2 GEN, locked=credits=liability=0 GEN and native balance=0 GEN.

Issuer offers, assents and two withdrawals were six authorized script-signed
transactions. Both withdrawals independently prove exact 1-GEN contract-native
decreases. These peer actions do not claim browser issuer execution.

Safe evidence: [buyer wallet journal](browser-wallet.json),
[issuer peer journal](browser-peers.json) and [final canonical read](final-canonical.json).
The last read, at 2026-10-07T02:42:45.202Z, proves five bundles and source parity:
received=withdrawn=10 GEN, locked=credits=liability=0 GEN, native balance=0 GEN.
There are 46 distinct FINALIZED/SUCCESS intelligent transactions across both
journals and the existing deployment journal. The reverted fee envelope and
two native funding transfers are excluded from that count.

The additional buyer browser recovery is documented below.
The actual browser purchase/read/finality paths are now proved; previous pending
statements above describe the earlier evidence collection stage.

## Additional in-app expired-purchase recovery

Bundle `cw-browser-expiry-20261007-01` was purchased for 2 GEN with the same
OKX buyer. No issuer offers or assents were submitted. Its real review deadline
was 2026-10-07 11:04 UTC+7. After that time, the frontend prepared the refund,
buyer withdrawal and archive; the human signed each in OKX.

| Browser action | Transaction | Finalized canonical result |
| --- | --- | --- |
| Purchase 2 GEN | `0xbac79a7e09f97c06ff2ef43e0ed3ac4c920a77be40be0abfeb402b6cd9a83511` | OPEN, 2 GEN locked |
| Recover purchase | `0xc7346bdfdec74ac27ed2934b4b5a8ee5198f41f9e8788756c1d40c2691df605e` | REFUNDED, buyer credit 2 GEN |
| Withdraw my GEN | `0xaa760c84aba73bb8e595cc6bbea57681f732f1cad0dbc8d9db20c902977177f6` | Exact native decrease 2 GEN; credit and liability 0 GEN |
| Archive agreement | `0x4bb9b0adda79ee10b4a5fe98d5be10a32b1dabfc689bc276190a0c4c7ce051f4` | CLOSED, received=withdrawn=2 GEN |

All four transactions are FINALIZED/SUCCESS. Archive finalized at
2026-10-07T07:25:48.780Z. Before withdrawal the contract held 2 GEN and the
buyer held 0.999370521499993476 GEN; after withdrawal the contract held 0 GEN
and the buyer held 2.999244215749992653 GEN. The net increase of
1.999873694249999177 GEN accounts for the network fee. These values were read
independently of the internal credit ledger.

The first refund hash
`0xaba7e26d4d9434d05d364e6f0c52857f1b54781d46a59a0b82edfa820df928a0`
was CANCELED / NO_MAJORITY. It had zero consensus rounds; canonical state
remained OPEN with 2 GEN locked. Its cause is not established. After that terminal
status and fresh state reads, one browser retry finalized successfully. The
canceled transaction is retained and excluded from successful counts.

Read-only commands:
`node scratch/extra-browser-proof.mjs <bundleID> <method> <UI hash> <buyer>`;
`node scratch/final-canonical-read.mjs`; `node scratch/public-browser-recovery.mjs`.
The private verification helpers perform zero writes. The sanitized durable
outputs are the [recovery journal](browser-recovery.json) and
[latest canonical read](latest-canonical.json).

The final read at 2026-10-07T07:26:30.177Z proves six CLOSED bundles,
received=withdrawn=12 GEN, locked=credits=liability=native balance=0 GEN and
deployed source parity. There are 50 distinct successful finalized intelligent
transactions. The canceled refund, earlier reverted purchase and three native
funding transfers are excluded. The [additional native funding](browser-recovery-funding.json)
was 2 GEN from the authorized owner to the browser buyer.

Expired-purchase browser recovery and recovery from a canceled wallet transaction
are now proved. Semantic review retry and unused-permit expiry have local test
coverage. These additional evidence items do not change the Portal submission.
