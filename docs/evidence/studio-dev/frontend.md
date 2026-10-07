# Frontend and hosting evidence

Verified on 2026-10-06; wallet diagnosis updated 2026-10-07. Live app: https://coverweave-genlayer.vercel.app

Vercel project `coverweave-genlayer`: framework Vite, root `frontend`, build
`npm run build`, output `dist`, Node 24.x, source files outside root enabled.
The only configured app environment value is the public deployed contract address.
Deployments use the reviewed public Git repository; local secrets are not uploaded.

## Production verification

Command: `curl -I https://coverweave-genlayer.vercel.app`

Observed: `HTTP/1.1 200 OK`, `Content-Type: text/html; charset=utf-8`.

Command: `curl -s https://coverweave-genlayer.vercel.app`

Observed HTML includes:

```html
<title>CoverWeave — Permission, together.</title>
<body><div id="root"></div></body>
```

Read-only POST `/api/ic` with `eth_chainId` returned HTTP 200 and
`{"jsonrpc":"2.0","id":1,"result":"0xf22d"}` (Studio Dev 61997).

Chrome then loaded `/bundles/cw-studio-complement-20261006-01` and displayed the
actual goal, accepted issuer grants, archived status, fixed purchase 2 GEN,
both solo grants missing part of the goal and combined grants covering it.
Dates and labels are English. Canonical reads use the real SDK through the
same-origin proxy. No CORS/Failed to fetch failure remains. Screenshot inspected.

## Deployment history

| Deployment | Git revision | Result |
| --- | --- | --- |
| `dpl_6tZHGdJzfQDLBehdzXdvheUt3QFF` | `f43cb94f03683c2257354ee9247da6855f070c89` | Static app READY; API failed at runtime due preserved `.ts` imports. Not counted as successful canonical read. |
| `dpl_D2s7kynSTFcQKkKSRehA2dGdDcKi` | `64b80a2c55cd5708f949449d75bcc89df7593642` | READY, production alias resolved; API and canonical browser reads verified. |

The compiled-entry regression reproduced `ERR_MODULE_NOT_FOUND` before the fix,
then passed after standard `.js` ESM specifiers. It also proves the compiled
entry continues to block broadcasting. The app design was preserved.

## Wallet proof boundary

Chrome detected both MetaMask and OKX in the centered wallet dialog. No provider
is auto-selected. Local real-SDK adapter tests cover all nine writes and a 2-GEN
purchase with intercepted provider I/O. They do not prove actual wallet signing.
The finalized Studio lifecycle in this initial observation was script-signed
evidence. The later buyer browser lifecycle and recovery are documented below.

On 2026-10-07 the current Chrome profile listed OKX only. Its own-app connection
request rejected with EIP-1193 code 4001; the provider returned no account. This
is account-access rejection, not signing or an onchain failure. The production
app now explains how to approve account access and retry. A component regression
first failed on the absent guidance, then passed; all 168 local cases pass.
Production deployment `dpl_C5n5uk9HsT7gTr9S9L4K26HTF57B` was READY, and Chrome
displayed the exact new guidance after a real connection attempt. This proves
error recovery presentation only. It does not close the browser execution gap.

## In-app OKX envelope and fee repair, 2026-10-07

At the owner's explicit request the browser switched to Codex's in-app browser.
The wallet picker detected MetaMask and OKX. OKX exposed buyer
`0x4e776b88e79c4f82f4e01115dd52c43e0cec6034` on Studio Dev.
After separately authorized owner funding of 2 GEN plus 1 GEN, native receipts
and exact balance increases proved a 3-GEN balance. Funding is native EVM
evidence and is not intelligent-contract consensus evidence.

The owner signed purchase envelope
`0x07b04c955d1cf3fb9d4ed8859be397d7ef1c20660baa99221d534634decda5a3`.
Its EVM receipt reverted with the recognized `FeeValueMustBeNonZero` reason.
Read-only inspection proved the agreement absent, buyer balance 3 GEN and
native contract balance 0 GEN. There was no successful contract execution.
Both official Studio Dev RPC hostnames returned the same failure and balances;
the issue was not resolved by switching networks or resending the purchase.

The frontend now supplies the exact write's Studio profiler fee preset, with a
1-GEN fee cap, and recognizes reverted EVM envelopes during confirmation.
The actual-SDK regression reproduced the missing deposit before the repair;
the read-only resume regression reproduced the indefinite pending display.
Both pass, along with the safe fee-preset projection and compiled server entry.
`npm run check`: 170 passed, zero skipped, lint/typecheck/build success.
Browser successful lifecycle proof remains pending.
An initial production fee-profile probe failed before any broadcast because the
proxy lowercased its destination. A controlled Studio read/simulation comparison
proved checksum spelling succeeds while lowercase reports contract-missing.
The proxy destination and its regression were corrected; this did not change
contract source, address, network or deployed accounting.

Sanitized records: [browser wallet attempts](browser-wallet.json) and
[native funding](browser-funding.json).

## Actual in-app buyer execution, 2026-10-07

The owner used OKX in Codex's in-app browser with buyer
`0x4e776b88e79c4f82f4e01115dd52c43e0cec6034`. The frontend prepared each
transaction and the owner performed its final wallet signature. Each successful
write displayed its submitted/accepted/finalized states and reloaded canonical
contract views. This uses the same deployed contract and pinned source.

| Buyer action | Hash | Verified canonical result |
| --- | --- | --- |
| Purchase 2 GEN | `0x50baf25100ae7162a8266bf15467092766e891f556d23e7b66c63432cd1aeef4` | FINALIZED/SUCCESS, OPEN, 2 GEN locked |
| Accept the definition | `0x52d3e006191edef98058ea7d1e08a2f3ffed417e044f5df0bdea493bfba0ecf6` | FINALIZED/SUCCESS, READY, assents=7 |
| Check coverage | `0x8760031b463d10e6c13d52cdfda6923b86d0a240be5dfc84cad33340df318c29` | FINALIZED/SUCCESS, PURCHASED, I/I/C, 1 GEN credit per issuer |
| Use permission | `0x001cc2bff405558ec02a834e86ac715cf62434d6f85be55e0970008b851daa56` | FINALIZED/SUCCESS, permit CONSUMED |
| Archive | `0x14152326ec4b196c388ee644ae60ec011e249a2a3f6647bf94e96ea779731042` | FINALIZED/SUCCESS, CLOSED, zero liability/native balance |

Issuer A/B offers, definition acceptance and withdrawals were signed by the
authorized issuer scripts. They are not browser issuer-signing proof. Both
withdrawals finalized successfully with exact 1-GEN native contract-balance
decreases. Global accounting then showed 10 GEN received and withdrawn across
five bundles, zero liability and zero native balance. Buyer archive finalized at
2026-10-07T02:42:20.301Z; the actual UI displayed Archived and no further action.
The complete five-action buyer browser lifecycle is proved. The additional
expiry-recovery evidence below extends this observation with four more actions.

The browser signing revision was `07a5a9f7351bc0e54ccdc16fb86bcb3c999483e6`,
production deployment `dpl_DewbKxuEvmnyR1i1bTWgxJWprbaR` READY. Its CI run
[37558053275](https://github.com/duclucky/coverweave-genlayer/actions/runs/37558053275)
was SUCCESS. Later documentation revisions require their own successful CI.
The final safe [buyer journal](browser-wallet.json), [issuer journal](browser-peers.json)
and [global read](final-canonical.json) contain the projected verification data.

## Additional buyer browser recovery, 2026-10-07

The same OKX buyer completed purchase, Recover purchase, Withdraw my GEN and
Archive agreement for `cw-browser-expiry-20261007-01`. Every action was prepared
by the frontend and signed by the human in the extension, then finalized
successfully and reloaded canonical state. The actual review deadline elapsed
before refund. Withdrawal decreased the native contract balance exactly 2 GEN;
the buyer's net increase was 1.999873694249999177 GEN after fees. Final state is
CLOSED with zero credits, liability and native balance.

The first refund `0xaba7e26d4d9434d05d364e6f0c52857f1b54781d46a59a0b82edfa820df928a0`
was CANCELED / NO_MAJORITY with zero consensus rounds and unchanged accounting.
It is retained separately. After terminal cancellation and fresh canonical reads,
one retry succeeded. This proves recovery from a canceled wallet transaction;
it does not prove semantic retry after an inconclusive validator judgment.
The cause of that cancellation was not established. No code change was needed
for the successful retry and recovery.

Safe [recovery journal](browser-recovery.json), [separate native funding](browser-recovery-funding.json)
and [latest canonical read](latest-canonical.json) prove six CLOSED bundles,
50 successful finalized intelligent transactions and 12 GEN received and
withdrawn. Semantic review retry and unused-permit expiry are separate branches
with local test coverage.
Commands used read-only receipt/view inspectors; they performed zero writes.

During refresh, Workspace showed one explicit public-RPC read error. The UI
offered Try again; direct return to the agreement reloaded canonical zero credits
and exposed Archive. No missing data was replaced with simulated state. This
transient read failure is retained as a service availability limitation.
