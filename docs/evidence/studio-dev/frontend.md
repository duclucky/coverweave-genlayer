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
The finalized Studio lifecycle is script-signed evidence. Browser-wallet lifecycle
remains **PENDING_REAL_EVIDENCE**, so Gate 13 execution and submission readiness
are not claimed. No external adoption is claimed.

On 2026-10-07 the current Chrome profile listed OKX only. Its own-app connection
request rejected with EIP-1193 code 4001; the provider returned no account. This
is account-access rejection, not signing or an onchain failure. The production
app now explains how to approve account access and retry. A component regression
first failed on the absent guidance, then passed; all 168 local cases pass.
Production deployment `dpl_C5n5uk9HsT7gTr9S9L4K26HTF57B` was READY, and Chrome
displayed the exact new guidance after a real connection attempt. This proves
error recovery presentation only. It does not close the browser execution gap.
