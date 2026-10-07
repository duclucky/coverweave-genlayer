# CoverWeave specification

## Identity

- Idea ID: IDEA-040
- Project name: CoverWeave
- Project slug: coverweave
- Category: Projects (new complete application, not an existing-project milestone)
- Status: IMPLEMENTED; finalized Studio lifecycle, hosted reads and buyer browser lifecycle verified; external acceptance unclaimed
- Repository: https://github.com/duclucky/coverweave-genlayer
- Target network: Studio Dev, chain 61997; locked IC RPC studio-next.genlayer.com/api
- Runtime: v0.3.0 with concrete py-genlayer runner 5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng
- SDK target: genlayer-js 2.0.0-rc.1; frontend Vite/React

## One-sentence product hook

Combine two protocol grants, judge their coverage by meaning, and share a 2 GEN purchase by each issuer's marginal contribution.

## Trust problem

The buyer or one issuer must not privately decide whether each exact grant
independently covers the goal, or only contributes as a complement. That decision
changes issuer GEN shares and a buyer's protocol permission. A signed database
authenticates the operator's record but cannot remove that operator's control over
the semantic decision. An ordinary EVM contract cannot evaluate natural-language
coverage. GenLayer validators independently assess the exact three coalitions;
deterministic contract code alone derives money and permit state.

## Fingerprint

1. Trust problem: marginal semantic usefulness of complementary or substitutable
   constitutive permission grants must not be privately decided by buyer/issuer.
2. Actors/adversary: one buyer funds 2 GEN; two named issuers can each gain
   0, 1 or 2 GEN and would inflate their standalone usefulness. They must assent
   to the same fixed sharing formula before review.
3. Evidence class + authenticity mechanism: three-role transaction-authored
   objective and grants, exact digest ratification and dated W3C context.
   Grants are protocol-created representations, never external IP/ability proof.
4. Consensus question: for coalitions A, B and AB, is the complete locked
   objective authorized by the union of available positive permission grants?
   Output COMPLETE/INCOMPLETE/UNVERIFIABLE for each exact coalition.
5. State machine: draft -> two frozen offers -> all-party ratified ready ->
   append-only review -> purchased bundle or no-cover refund -> one-time permit
   consumption and pull withdrawals; expiry refunds buyer, no orphaned purse.
6. Direct consequence: if vAB=1, credit A = (vA+1-vB) GEN and B =
   (vB+1-vA) GEN; mint buyer's one-time bundle permit. Otherwise refund 2 GEN.
   Semantic output cannot supply payees, amounts, IDs or payout rules.
7. Reuse surface: bundle/offer/ratify/review/coverage/permit/consume/recover/
   credit/accounting interfaces without copying the semantic judge.

## Mandatory gate matrix

| Gate | PASS/FAIL | Evidence/reason |
| --- | --- | --- |
| Replacement | PASS_ADMISSION | a buyer-run DB/backend can privately bias marginal grant meanings and issuer shares; independent validators determine the only vector that opens the locked onchain purse and permit. |
| Judgment | PASS_ADMISSION | natural-language full-goal coverage by unions of positive grants is semantic; synonyms/complementarity cannot be a deterministic lookup. |
| Evidence availability | PASS_ADMISSION | bounded canonical terms are independently present in validator state; target-runner spike fetched dated W3C context and produced all four meaningful vectors twice. Context is not external factual proof. |
| Evidence authenticity | PASS_ADMISSION | complete matrix above; chain-authenticated constitutive offers and exact three-party assent are authoritative for these newly created protocol permissions only. Provenance failures block consequences. |
| Equivalence | PASS_ADMISSION | exact normalized A/B/AB vector, independent semantic replay, fixed enums/IDs, monotonicity; no rationale or model amounts trusted. |
| Consequence | PASS_ADMISSION | vector directly determines 2-GEN shares/refund and one canonical buyer permit, with deterministic formula and single consumption. |
| Adversarial | PASS_ADMISSION | A/B prefer larger own marginal value; buyer prefers failed coverage/refund. All must preaccept the immutable definition and formula. |
| State model | PASS_ADMISSION | isolated immutable IDs, exact roles, append-only attempts, one settlement, explicit all-purse destinations and every temporal write's own boundary guard, perpetual withdrawals and zero-liability closure. |
| Reuse | PASS_ADMISSION | three named proposed consumer contexts and typed bundle, coalition, permit, credit and recovery interfaces, no core judge fork. |
| Contract count | PASS_ADMISSION | exactly one contract owns independent canonical state, GEN accounting and permit enforcement. A pass-through second guard is absent. |
| Differentiation | PASS_ADMISSION | nearest comparisons above have <=2 material matches; coalition marginal coverage/share purchase differs from matching, tier waterfall, conflict scheduling, attribution and grant attenuation. |
| Claim-to-code | PASS_ADMISSION | every scoped claim has planned write/state/view/test/UI and real evidence requirement above; service delivery is outside the protocol. |
| Full lifecycle | PASS_ADMISSION / PASS_EXECUTION | Complete design admitted separately from execution. Studio allocation/recovery and exact native withdrawals are verified. The in-app OKX buyer completed purchase, assent, review, use and archive; issuer steps are script-signed, explicitly distinct. |
| Scope honesty | PASS_ADMISSION | constitutive protocol rights only; external legal, performance, IP and service execution are outside the protocol; unsigned simulation cannot prove finalized multi-validator consensus, withdrawal or browser flow. |

Gate 13 execution has separate current buyer-browser and issuer-script evidence.
Admission alone was never counted as execution or submission readiness.

## Actors, roles and incentives

| Actor | Permissions | Value at risk | Incentive to bias |
| --- | --- | --- | --- |
| Buyer | Open, exact assent, review, expired refund, consume/expire permit, withdraw own refund, zero-liability close | Fixed 2 GEN purchase plus network fees | Prefer refund or overly broad combined permission |
| Issuer A | Own immutable offer, exact assent, review, withdraw own share | Potential 0/1/2 GEN earned share; no deposit | Claim standalone completeness to receive larger share |
| Issuer B | Same permissions for its own fixed slot | Potential 0/1/2 GEN earned share; no deposit | Understate partner contribution or overstate own grant |
| Independent validators | Re-fetch fixed terminology context, judge canonical terms and independently replay leader vector | Consensus role, not configured payout recipient | Malicious leader tested; no payee/amount authority |
| Other wallet | Public views only, may create a separate isolated bundle | Own separate purchase only | Cannot mutate another bundle's grants/assent/credit |

## Scope and non-goals

### In scope
One buyer and two distinct issuers; protocol-created positive grant terms;
three-party exact-definition assent; A/B/AB semantic coverage; fixed cooperative
2 GEN sharing; one buyer permit; isolated history; all value recovery; full
multi-page wallet app with real canonical reads and finality after integration.

### Out of scope
External delivery or service availability, legal/IP rights, external enforcement,
authenticated model inference, custody of wallet keys, upgrades,
debt priority, matching capacity, fault attribution, arbitration or generic oracle.
No bond, fee, appeal deposit or hidden remainder. No external consumer contract.

## Product/frontend blueprint

### Finalized capability sketch

Buyer defines a goal, names two issuers and funds exactly 2 GEN. Each issuer
offers one immutable grant. All three accept the complete agreement. A party
requests review; finalized canonical coverage determines shares and a buyer
permit or refund. Buyer consumes or expires the permit; credit owners withdraw;
buyer closes only after zero liabilities. UI needs exact actors, terms, assent,
deadlines, status, coverage, permit and own credit. It never needs raw storage.
Every write tracks submitted/accepted/finalized/failed; timeout requires status
recovery before retry. Configuration missing blocks writes without fabricated
state. Canonical reads resume the journey after reload. No UI-selected payouts.

### Human users and jobs

| User/role | Primary job | Decision or outcome needed |
| --- | --- | --- |
| Buyer | Secure a jointly useful permission bundle | Understand coverage, assent to exact grants, consume permit or recover GEN |
| Issuer A/B | Offer a useful protocol permission and collect fair share | Review complete terms, assent, see own marginal contribution and withdraw |
| Returning participant | Find earlier agreements and outstanding credit | Search/filter by ID/goal/status, revisit history and finish recovery |

### Information architecture

| Screen/view | User purpose | Primary action | Required states | Mobile behavior |
| --- | --- | --- | --- | --- |
| Welcome `/` | Understand complementary grants and fair sharing | Start a bundle; secondary explore workspace | Static explanation, network/config notice, live-state link | Stacked editorial panels; no decorative metrics |
| Workspace `/bundles` | Find agreements needing my attention or revisit history | Search/filter and open bundle | Loading, disconnected, unconfigured, empty, success, fetch failure with retry | Cards replace dense rows; filters wrap |
| New bundle `/bundles/new` | Define exact goal and invite two issuers | Two-step form: terms -> review and fund 2 GEN | Retained input, field validation, missing wallet/config, transaction feedback | Single-column labelled fields; visible step/back controls |
| Bundle detail `/bundles/:id` | Complete role-specific agreement and inspect result/history | Offer/assent/review/use/recover according to role/state | Not found, loading/error, awaiting offers/assents/review, retry, purchased/refunded/closed | Terms first, next-action card, then coverage/history; no overflow |
| My credits `/credits` | Recover earned or refundable GEN | Withdraw eligible bundle credit, revisit linked agreement | Wallet required, loading/empty/error, positive credit, pending/finalized withdraw | Linked cards with amount in GEN and one contextual action |
| Guide `/guide` | Understand rules, limits and integration | Read workflow and API links | Complete static content; external links labelled | Readable text measure and collapsible technical reference |
| Account `/account` | Inspect selected wallet/network and disconnect | Connect/change wallet or logout | Disconnected, wallet picker/no providers, wrong chain, connected | Address wraps, 44px controls; no secret inputs |
| Not found `*` | Recover from incorrect link | Return to workspace | Explicit missing-page copy | Single clear recovery action |

Persistent header connects Welcome, Workspace, Credits and Guide; start action
links the new form; clickable account links Account and logout. Detail is
reachable from workspace, credits, direct URL and post-finalization creation.
Main journey: welcome -> create/review -> wallet transaction -> detail ->
agreement/coverage -> permit/credits -> history -> return. No fake data is needed
to show first-run states; configured network data arrives only through adapter.

### Visibility matrix

Use exactly one visibility class per row: `USER_PRIMARY`,
`USER_CONTEXTUAL`, or `SYSTEM_ONLY`.

| Function/data group | Visibility | Eligible role/state | User need or reason hidden |
| --- | --- | --- | --- |
| Goal, issuer grants, current user role, assent progress | USER_PRIMARY | Participants, all states | Decide what is agreed and what to do next |
| Coverage labels and role-specific next action | USER_PRIMARY | Reviewed or actionable state | Understand result and complete agreement |
| Own credit, purchase amount and deadlines | USER_PRIMARY | Credit owner or participant | Decide whether to fund, recover or act before expiry |
| Other parties' share explanation | USER_CONTEXTUAL | Finalized bundle | Explain fairness without exposing raw accounting |
| Exact agreement digest and explorer verification | USER_CONTEXTUAL | Detail disclosure | Optional verification; digest never presented as authenticity proof |
| Attempt storage, model raw output and validator internals | SYSTEM_ONLY | No end-user state | Reviewer/debug material excluded from product |
| Aggregate accounting and submission evidence | SYSTEM_ONLY | No normal workflow | Not user metrics or product value |

### UI action matrix

In Stage 1, the contract capability/method may be finalized. Stage 2 must
replace it with the finalized public interface before contract code.

| Visible control | Contract capability/method | Eligible role | Legal state | Input/value | Finality | Failure/recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Create agreement | open_bundle | Buyer | New ID | Goal, named issuers, deadlines, 2 GEN | Wait finalized then detail read | Retain form; recover transaction status before retry |
| Offer my grant | offer_grant | Named issuer | OPEN, empty own slot | Exact bounded positive terms; no GEN | Finalized grant/bundle reload | Field/caller/deadline error; no overwrite |
| Accept agreement | ratify_bundle | Buyer/A/B | Both offers, unassented | Canonical full digest; no GEN | Finalized assent/bundle reload | Refresh stale terms; expired cannot assent |
| Check coverage / Retry coverage | review_bundle | Registered party | READY/RETRYABLE, <2 attempts | Bundle ID; no GEN | Accepted feedback, finalized coverage/credits/permit read | Unverifiable keeps purse; deadline recovery |
| Use permission | consume_permit | Buyer | PURCHASED, AVAILABLE, unexpired | Bundle ID; no GEN | Finalized permit reload | Used/late/wrong actor rejected |
| Recover purchase | refund_expired | Buyer | Pending, review deadline elapsed | Bundle ID; no GEN | Finalized refund/credit reload | Read terminal state before retry |
| Expire unused permission | expire_permit | Buyer | AVAILABLE, use deadline elapsed | Bundle ID; no GEN | Finalized permit reload | Earned issuer credits unchanged |
| Withdraw my GEN | withdraw_credit | Credit owner | Positive credit, terminal unclosed | Bundle ID; no amount input | Finalized credit/accounting reload and Explorer | Check existing tx before resend |
| Archive agreement | close_bundle | Buyer | Terminal, zero liability, no available permit | Bundle ID; no GEN | Finalized CLOSED reload | Finish withdrawals/permit first |

### User-facing state language

| Canonical status/violation | User-facing label | User consequence/next step |
| --- | --- | --- |
| OPEN | Collecting permissions | Issuers offer; all participants accept exact terms |
| READY | Ready for coverage review | A participant requests validator review |
| RETRYABLE | Coverage needs another review | No allocation; retry within bounds or wait for recovery |
| PURCHASED | Bundle purchased | Buyer may use permit; issuers withdraw shares |
| REFUNDED | Purchase refunded | Buyer withdraws GEN |
| CLOSED | Archived | Canonical history stays readable; no further writes |
| AVAILABLE / CONSUMED / EXPIRED | Ready to use / Used / Expired | Exactly one protocol consumption before use deadline |

### Wallet and transaction behavior

Scan EIP-6963 plus injected MetaMask/OKX/Rabby/Coinbase/Brave-compatible
providers. Centered picker lists detected wallets; never auto-select. Request
accounts only after user selects. Store selected provider/account in memory;
account menu logout clears both and disables writes. Verify/switch/add official
Studio Dev EVM wallet chain before write, separate from IC RPC reads through a
same-origin proxy if needed. No keys, localStorage canonical state or simulated
signature/balance/finality. Missing config is an explicit unavailable state.
Each transaction shows submitted, accepted, finalized, failed and recoverable
timeout; canonical reads follow finalization. Every control will retain the
typed adapter boundary when SDK wiring is implemented in the integration phase.

### Visual preservation constraints

- Visual language/layout to preserve: verified ui-ux-pro-max design system
  applied across all listed routes; product layout frozen after Phase 3B.
- Allowed functional edits: SDK, address, role eligibility, real reads/writes
  and honest finality/error refinements; no Phase 7 visual redesign.
- Excluded: raw storage, validator config/output, reviewer/submission claims,
  global counters and method names as primary actions.

## State model

### Stable IDs
Unique caller-supplied ASCII bundle ID of 1-64 letters/numbers/underscore/hyphen.
Grant slots are fixed A and B, never caller-selected payout destinations.
Attempt IDs are bundle ID plus immutable increasing attempt index, at most two.
Canonical definition schema CW1 binds chain ID, contract address, bundle ID,
buyer/A/B addresses, goal, exact grant texts, deadlines and sharing policy.

### Structured storage
TreeMap[str, Bundle] and DynArray[str] ID index; TreeMap[str, Attempt].
Storage dataclasses use gl.storage.allow; fixed-width integer annotations for
time, mask and attempts; bigint annotations for exact GEN value accounting. Bundle contains actors,
exact texts, immutable deadlines, assent mask, definition digest, phase,
permit phase, received/locked/credit/withdrawn counters and attempt count.
Attempt stores three normalized classes, outcome/context status and
canonical review timestamp. No raw JSON registry, global last_* state or UI ledger.
Global totals only track received/locked/credits/withdrawn accounting, never verdict.

### State machine
OPEN -> READY after all three exact assents -> PURCHASED or REFUNDED by review.
READY/RETRYABLE -> RETRYABLE on non-consequential unclear meaning/source outage.
OPEN/READY/RETRYABLE -> REFUNDED by authorized expired recovery.
PURCHASED permit AVAILABLE -> CONSUMED or EXPIRED. Terminal bundle -> CLOSED
only after locked value and all credits are zero and no available permit exists.

### Temporal entrypoint rules
Canonical time is UTC seconds parsed from gl.message.raw['datetime']; reject
missing timezone rather than use host time. Upper bounds are strict; equality
is late. now < offer_deadline for offer and assent; now < review_deadline for
review/retry; now < use_deadline for consume. Refund requires now >= review
deadline; permit expiry requires now >= use deadline. Each write executes its
own guard, including stale stored phase. Opening validates ordered deadlines
within 7/14/21 days. Withdrawal/close are N/A time because earned/refund liability
must remain recoverable forever and closure requires zero liability.

### Illegal transitions
Duplicate ID, role collision, overwritten offer, wrong definition digest,
duplicate assent, review without all assents, review after terminal settlement,
third persisted attempt, early/unauthorized refund, consuming twice/after expiry,
expired permit resurrected, withdrawing another actor's credit, closing with any
liability or available permit: reject before mutation. Nonpayable writes reject GEN.

### Authorization
Creation uses authenticated sender as buyer. Exact immutable issuer addresses
control their own slots. Only buyer/A/B can assent/review; refund, consume,
expire and close are buyer-only. Withdrawal can access only sender's credit and
always transfers to that same sender. Contract role checks, not UI, are authority.

### Idempotency and double-action prevention
Duplicate action rejects deterministically without new accounting. Resume scripts
read canonical stage/assents/attempts/credit and transaction status before retry.
No action accepts externally computed shares, verdicts or arbitrary recipients.

## Write-method safety matrix

| Method | Caller | Allowed states | Forbidden states | Temporal/expiry gate | Idempotency | Value/accounting effect | Views affected | Negative tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| open_bundle(id,goal,A,B,offer,review,use) | Authenticated buyer | New unique ID | Existing ID, invalid roles/time/text/value | now < offer <= now+7d; offer < review <= now+14d; review < use <= now+21d | Duplicate ID rejects | Payable exactly 2 GEN; received/locked +2 GEN | Bundle, ID index, bundle/global accounting | Dust/zero/overpay, duplicate, invalid roles, deadline equality/limits, metadata |
| offer_grant(id,terms) | Exact A/B issuer | OPEN, empty own slot | Other role/entity, overwritten slot, terminal | now < offer_deadline | One offer; duplicate rejects | No GEN; immutable own terms and recomputed definition | Grant, bundle/digest | Wrong actor/bundle, duplicate, late stale phase -1/equal/+1, bound text injection |
| ratify_bundle(id,digest) | Exact buyer/A/B | OPEN with both grants | Missing grant, wrong digest/version, existing own flag, terminal | now < offer_deadline | One flag per role; duplicate rejects | No GEN; READY only after full mask | Bundle, grants/assent | Valid-byte wrong-role/entity/network/schema/digest, replay, stale -1/equal/+1 |
| review_bundle(id) | Buyer/A/B | READY or RETRYABLE, attempts <2 | Unratified, purchased/refunded/closed, attempt exhaustion | now < review_deadline | One terminal allocation; duplicate rejects | Valid vector moves 2 GEN locked to fixed credits and permit/refund; retry changes attempt only | Bundle, attempt, permit, credit, accounting | Wrong role/state, extra/missing/enums, malicious leader/replay, non-monotone semantics, stale -1/equal/+1; all reject accounting unchanged |
| refund_expired(id) | Buyer | OPEN/READY/RETRYABLE | PURCHASED/REFUNDED/CLOSED | now >= review_deadline | One refund; repeat rejects | Locked 2 GEN -> buyer credit; no permit | Bundle, own credit/accounting | Wrong actor, before/equal/after with stale phase, settled, duplicate/no double-credit |
| consume_permit(id) | Buyer | PURCHASED + AVAILABLE | NONE/CONSUMED/EXPIRED, other phase/actor | now < use_deadline | One consumption; repeat rejects | No GEN; permit CONSUMED only | Permit, bundle | Wrong holder/entity/state, stale -1/equal/+1, duplicate, accounting unchanged |
| expire_permit(id) | Buyer | PURCHASED + AVAILABLE | Used/expired/closed, wrong actor | now >= use_deadline | One expiry; repeat rejects | No GEN; earned issuer credits unchanged | Permit, bundle | Before/equal/after, wrong caller/state, repeat/no refund of earned credit |
| withdraw_credit(id) | Exact credit owner sender | PURCHASED/REFUNDED with positive own credit | Wrong owner, pending/closed, zero credit | N/A: perpetual recovery of liability | Own credit zero before EVM transfer; repeat rejects | Credits decrease, withdrawn increase by exact amount; EVM recipient fixed to sender | Own credit, bundle/global accounting | Wrong actor/state/entity, duplicate/closed, failed emission rollback, exact contract balance decrease |
| close_bundle(id) | Buyer | REFUNDED or PURCHASED with used/expired permit and zero locked/credit | Pending, active permit, nonzero liability, CLOSED | N/A: zero-liability archival independent of time | One close; repeat rejects | No GEN; retain history, set CLOSED | Bundle/accounting | Wrong caller/state, duplicate, orphan credit, live permit, no accounting drift |

## Frontend lifecycle coverage matrix

| Canonical state | User action | Contract write | UI component | Frontend test | Evidence status |
| --- | --- | --- | --- | --- | --- |
| New | Review exact terms and reserve 2 GEN | open_bundle | NewBundle two-step form | Buyer creation -> finalized detail adapter test | Local UI PASS; buyer browser FINALIZED/SUCCESS |
| OPEN, own grant missing | Offer permission | offer_grant | BundleDetail next-action form | Exact issuer terms command/reload test | Local UI PASS; issuer script FINALIZED/SUCCESS |
| OPEN, both offers | Accept complete agreement | ratify_bundle | BundleDetail exact-digest action | Assent command/digest/reload test | Local UI PASS; buyer browser and issuer script FINALIZED/SUCCESS |
| READY | Check coverage | review_bundle | BundleDetail contextual review | Review command/reload + coverage rendering | Local UI PASS; live script and buyer browser FINALIZED/SUCCESS |
| RETRYABLE | Retry coverage | review_bundle | BundleDetail retry label | Retry command/reload + bounds tests | Local UI PASS; live retry/failure proof PENDING |
| PURCHASED, AVAILABLE | Use permission | consume_permit | BundleDetail buyer action | Consume command/reload and equality tests | Local UI PASS; buyer browser FINALIZED/SUCCESS, CONSUMED |
| Pending and expired | Recover purchase | refund_expired | BundleDetail recovery action | Refund command/reload and stale-boundary test | Local UI PASS; script expiry refund and native withdrawal PASS; browser signing PENDING |
| PURCHASED, unused expired permit | Expire permission | expire_permit | BundleDetail recovery action | Expiry command/reload and equality tests | Local UI PASS; live recovery PENDING |
| Terminal, positive own credit | Withdraw GEN | withdraw_credit | BundleDetail / Credits | Own-share command/reload test | Local UI PASS; script native balance/recipient proof PASS; browser signing PENDING |
| Terminal, zero liability, no live permit | Archive agreement | close_bundle | BundleDetail buyer action | Close command/reload and accounting gate test | Local UI PASS; script and buyer browser canonical CLOSED, zero liability/native balance |
| Any | Read/filter/history/logout | Views and wallet session only | Workspace/Detail/Account | Canonical rendering, explicit read error, logout hides writes | Browser local navigation and production canonical reads PASS; wallet logout tests PASS |

## Evidence policy

Authoritative consequential evidence is the exact constitutive transaction state:
objective, named roles, issuer-authored grant terms and all-party assent. A sender
is authoritative only for its newly created protocol permission, never an external
real-world fact. No hosted actor JSON, screenshot or self-reported performance
can be introduced by any write. Definition SHA-256 proves exact binding only;
authenticated sender/role and stored assent establish protocol authorship.

The definition digest is recomputed from the exact stored terms before review;
bind chain ID, contract address, entity, actors, schema CW1, terms, deadlines,
context URL/version and sharing rule. Any mismatch rejects before LLM or GEN.
Freshness uses canonical transaction timestamps and entrypoint deadlines;
unique IDs, one immutable offer, one flag and terminal guards prevent replay.
No caller-supplied timestamp or independently asserted issuer signature exists.

Fixed optional terminology origin: https://www.w3.org/TR/2018/REC-odrl-model-20180215/ .
Context is fetched inside leader and validator on the target runtime, bounded
to 300000 characters, HTTP 200, dated version and Permission markers; missing
or contradictory context yields non-penalizing retry. It authenticates terminology
only and never proves ownership, delivery or external authority. No stored
fetched-body digest is used; therefore no hash is misrepresented as provenance.
Canonical definition digests are state-only and always recomputed, not fetched.

Prompt separates immutable policy/objective/roles from quoted untrusted grant
text. Text cannot change required IDs, payees, money, authority or sharing policy.
Missing ambiguous grant scope yields UNVERIFIABLE. Malformed output rejects;
transient context failure yields retry without permit/credit/refund settlement.
Private/unavailable external evidence is excluded from the consequence surface.

### Evidence Authority Matrix
| Consequential claim/fact | Evidence/artifact | Data controller | Authoritative source/issuer | Deterministic verification | Canonical objective/entity/actor binding | Freshness/anti-replay | Semantic role after verification | Non-penalizing failure state | Consequence blocked | Required negative test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exact buyer goal and named grant roles constitute this purchase | open_bundle canonical record | Buyer supplies initial terms only | Studio Dev authenticated transaction sender + contract state | Unique ID, sender=buyer, valid distinct roles, fixed 2 GEN, schema and bounded ordered deadlines | Deployed network/contract implicit state namespace; bundle ID, exact buyer/issuers/goal fixed | Unique ID, immutable definition, canonical opening timestamp and deadlines | Goal meaning only, no proof of external work | Reject before mutation | All credits, settlement and permits | Same valid goal digest with wrong buyer/bundle/network/version cannot ratify/review; accounting unchanged |
| Exact issuer A/B grants are protocol-created authorizations | Role-checked immutable offer slots | Named issuer controls its own text only | Named issuer's authenticated chain transaction, not hosted JSON | sender=slot issuer, correct bundle/slot, empty slot, ASCII/size, time; recompute full definition digest | Bundle, A/B position, locked goal, actors and schema bound in ratification digest | One offer per slot, now < offer deadline, no future supplied timestamp or replaceable revision | Positive permission meaning; cannot assert external capability, IP ownership or completed delivery | Reject or semantic RETRYABLE | Allocation, permit, refund-by-semantic-review | Valid same bytes/digest submitted by different actor/slot/entity, or text redefining payees/authority; no hard-state change |
| All three parties accept the exact sharing policy and grant set | Canonical ratification flags + definition digest | Each registered party controls only its own assent | Authenticated buyer/A/B sender and contract-computed digest | Both grants exist; exact digest, sender membership, flag unset, strict deadline | Full objective, fixed actor roles, grant bytes, bundle, schema, deadlines and policy in digest | One assent per role, immutable full digest, now < offer deadline | No semantic authentication; flags are deterministic prerequisite | Reject before mutation | All judgment consequences | Valid digest from wrong role/bundle or earlier grant version, replay/stale/future attempt rejects without allocation |
| A/B/AB meanings authorize only configured consequence | Sandboxed leader Return + independent validator replay | Leader cannot control configured IDs/amounts | GenLayer validator consensus over exact authenticated state | Exact sole classes key, three enums/IDs, all-role assent, monotonicity and exact 2-GEN sum | Replay exact bundle definition; payees and goal from locked state | Append-only bundle attempt IDs, max two, review deadline, no terminal re-review | Full semantic coverage only | RETRYABLE or reject before mutation | Every allocation, permit and settlement | Valid-shape forged COMPLETE, extra payee/amount, wrong context, non-monotone vector or disagreement cannot settle |
| External terminology is context, never external permission provenance | Fixed dated W3C HTTPS document | W3C publisher | W3C origin fixed URL/version | Bounded fetch, HTTP 200, dated version/context extraction; no caller-controlled URL | Fixed policy context version, never actor IDs or payout authority | Dated immutable reference; no live performance claims | Context only; state terms remain the exact constitutive evidence | Source unavailable -> RETRYABLE if context required | No inference of external rights/performance, no source-derived payout | Claimant-hosted lookalike URL, changed version or artifact instructing altered goal/payees cannot reach consequence |

## Consensus design

### Leader task
Capture frozen canonical state before entering nondeterminism; sandbox cannot
read storage. Fetch bounded fixed terminology context; independently interpret
A alone, B alone and AB union against every part of the exact buyer goal.
Positive grants allow any subset: adding a grant cannot remove existing rights.
External ownership/performance assertions do not create authenticated facts.
Model output JSON has exactly one key classes, list length three, fixed A/B/AB
order, allowed COMPLETE/INCOMPLETE/UNVERIFIABLE strings, no additional keys.
Do not alias arbitrary keys, coerce enums or accept model-selected payouts.
Normalize decoded SDK JSON or exact JSON text; fenced or invalid
shape/extra fields raises a safe model error before state mutation.

### Consensus-critical fields
| Field | Type/bounds | Comparison rule | Why critical |
| --- | --- | --- | --- |
| Definition | Exact recomputed CW1 digest | Must match all-assented immutable state | Prevents wrong actor/entity/policy replay |
| Source coverage | Bounded dated terminology available or unavailable | Independent acquisition, normalized context flag | Missing context cannot create payout/permission |
| classes | Three exact enums, positions A/B/AB | Validator independently reruns and compares full tuple | Every marginal share depends on all three meanings |
| attempt identity | Current bundle index <2 | Derived deterministically; append-only | Prevents overwrite/hardcoded retry |

### Validator
Use gl.vm.run_nondet_default(leader, validator), coherent with pinned v0.3.
Require gl.vm.Return, exact normalized schema and settlement invariants, then
independently execute the same fetch and judgment from captured immutable inputs.
Compare context status and all three meanings, never rationale wording or shape
alone. Reject malicious valid-shape vectors if independent meaning differs.
Unexpected error means no acceptance; no unsafe unsandboxed default.
UNDETERMINED persists no fake verdict. Scripts/UI read status and canonical
attempt count before a bounded retry; no increment guessed from transaction.

### Settlement invariants
| Invariant | Deterministic enforcement | Invalid behavior |
| --- | --- | --- |
| Sufficient source/assent | Both grants exist, full three-party assent, exact recomputed binding; verified context before complete verdict | Reject or RETRYABLE, locked GEN and rights unchanged |
| Exact coverage | Positions A/B/AB covered once, array length 3, sole root key, exact enum | Reject before attempt/credit/permit mutation |
| Monotone union | COMPLETE A or B implies COMPLETE AB whenever vector is decisive | Reject contradictory vector before consequence |
| Unverifiable | Any unknown scope prevents decisive allocation | Persist retry record only, no settlement/credit/permit |
| Root cause/dependency | N/A: no fault/downstream classes; those fields are forbidden extras | Reject arbitrary consequence/fault fields |
| Contract-derived consequence | AB=COMPLETE then shares (vA+1-vB),(vB+1-vA), else buyer refund; locked payees only | Model amounts/addresses/status cannot be accepted |
| Conservation | Each share in 0/1/2 GEN, sum exactly 2 GEN; no fees/remainder | Reject before credit/debit if any sum mismatch |

### Rationale policy
Rationale is not stored or used for settlement. Canonical coverage plus fixed
formula explains outcome. Raw model/validator configuration never reaches UI.

## Consequence and accounting

| Verdict | Canonical state change | Consumer action | Value movement |
| --- | --- | --- | --- |
| AB COMPLETE, A/B incomplete | PURCHASED; AVAILABLE buyer permit | Buyer consumes once | 1 GEN credit A + 1 GEN credit B |
| AB COMPLETE, A/B complete | PURCHASED; AVAILABLE buyer permit | Buyer consumes once | 1 GEN credit A + 1 GEN credit B |
| AB COMPLETE, only one alone complete | PURCHASED; AVAILABLE buyer permit | Buyer consumes once | 2 GEN to complete issuer, 0 GEN other |
| AB INCOMPLETE with no standalone complete | REFUNDED, no permit | Buyer withdraws refund | 2 GEN buyer credit |
| Any UNVERIFIABLE / unavailable context | RETRYABLE, no permit | Bounded retry or authorized deadline recovery | Entire 2 GEN remains locked |
| Malformed/non-monotone/semantic disagreement | No accepted mutation | Diagnose/retry actual transaction | No value or rights change |

Each bundle and aggregate: received = locked + outstanding credits + withdrawn.
Locked purchase is 2 GEN until exactly one allocation/refund, then zero. Credits
are immutable-role purses, not model output. Withdraw debit precedes EVM external
interface emission. No IC-boundary transfer to an EOA; emission follows verified
target runtime mechanics and parent/child finalization. Parent success plus zero
credit is insufficient: exact native contract balance decrease by amount and
recipient evidence (fees identified separately) are required for every exit.
Contract balance must match liabilities after finalized children; global zero
closure proof after all bundles recover. Never report a raw value as human GEN.

Only finalized canonical judgment is used by frontend/integrations; accepted/
decided remains visibly pending. No separate callback consumer. Cure/appeal/
restore N/A: exact terms never change, no punitive bond; bounded re-review and
expired recovery own the actual failure surface. No arbitrary early cancellation.

### Value-destination matrix
| Value | Source/locked state | Release/refund destination | Terminal/recovery | Duplicate/late/retry | Proof |
| --- | --- | --- | --- | --- | --- |
| Purchase purse 2 GEN | Buyer/open_bundle, locked through OPEN/READY/RETRYABLE | COMPLETE AB -> configured A/B formula shares; INCOMPLETE AB or expiry -> buyer 2 GEN | PURCHASED or REFUNDED; no orphan branch | One settlement; late review rejects; retry stays fully locked | Bundle/global received=locked+credits+withdrawn |
| Issuer credit 0/1/2 GEN | Contract-derived share, PURCHASED | Same immutable issuer EOA only | Perpetual pull withdrawal; permit expiry does not revoke earned credit | Zero/duplicate reject, N/A expiry | Credit, parent/child receipt, exact contract balance decrease and recipient evidence |
| Buyer refund 2 GEN | No cover or authorized expiry | Immutable buyer EOA only | Perpetual pull withdrawal | One refund and one withdrawal | Credit/accounting plus same native transfer proof |
| Fee/remainder/bond | None in this version | N/A zero amounts, integer formula sums exactly 2 GEN | No hidden fee or residual | No fee input accepted | Exact settlement sum invariant |

## Reusable interface

### Write methods
open_bundle(id,goal,issuer_a,issuer_b,offer_deadline,review_deadline,use_deadline):
payable exactly 2 GEN, sender is buyer. All other writes nonpayable:
offer_grant(id,terms), ratify_bundle(id,definition_digest), review_bundle(id),
refund_expired(id), consume_permit(id), expire_permit(id), withdraw_credit(id),
close_bundle(id). No verdict, payee or payout input. Safe errors are bounded
user-facing codes/messages for wrong role, state, binding, time, value or model.

### View methods
list_bundle_ids(offset,limit), get_bundle(id), get_grant(id,slot),
get_attempt(id,index), get_permit(id), get_credit(id,owner), get_accounting(id),
get_global_accounting(). List bounded to 32 per page, no unbounded state dump.
Views return exact canonical actors/terms/deadlines/assents/phase/permit,
normalized history and accounting; frontend adapter formats GEN at display edge.

### Consumer/callback
No external consumer/callback in v1. The buyer alone consumes the permit once.
Future gateway must authenticate sender and use immutable permit identity for
idempotency; this enforcement gateway is roadmap work.

## Threat model

| Threat | Attack | Mitigation | Test |
| --- | --- | --- | --- |
| Forged protocol authorship | Same stable terms/digest from wrong role/entity | Exact sender/slot and full definition binding | Provenance tripwire, no accounting/rights change |
| Injection | Grant prose changes goal/payee/fee/authority | Locked state outside untrusted text, exact output enums | Injected authority/payout cannot settle, independent replay |
| Malicious leader | COMPLETE vector in valid shape but false meaning | Independent semantic validator, no shape-only acceptance | Leader/validator disagreement rejects |
| Malformed settlement | Missing/extra/reordered or contradictory coalition classes | Exact vector/schema, semantic replay, monotonicity/conservation | Reject before credit/permit or attempt mutation |
| Stale phase | Late offer/assent/review/use while phase remains open | Own transaction-time guard in each write | Boundary -1/equal/+1 + unchanged canonical state |
| Duplicate/reentrance | Repeated settlement/refund/consume/withdraw/close | Terminal/flag/credit guards, debit before emission | No double GEN credit/value exit or permit use |
| Orphaned value | Parties skip assent/review/consume | Buyer expired refund, perpetual credits, expiry, zero-liability close | All partial/terminal recovery branches |
| UI finality illusion | Hash or local fixture treated as canonical result | Typed real SDK adapter, finalized state reload, no localStorage ledger | SDK-account regression, status failure/timeout, browser CORS |
| External-right overclaim | Issuer claims outside ownership/delivery in text | Protocol scope only, no external facts authenticated | Unverifiable outside assertion, no external enforcement claim |

## Test plan

Test-first direct behavior suite after this full specification. Every public
write covers caller/state/time/idempotency/accounting; view tests prove isolation.
GenVM lint recognizes exactly one named subclass and payable metadata. Direct
leader tests supplemented by explicit captured validator replay and malicious
candidate tests; direct mode alone does not establish consensus.

Vectors: complement, substitute, dummy on A and B, no-cover, each unknown class,
non-monotone standalone COMPLETE/AB INCOMPLETE, invalid extra/missing/enum/schema,
prompt injection, unrelated contextual fact, swapped actor/bundle/policy binding.
Web: unavailable/404/oversized/wrong version; LLM malformed/fenced/wrong-key JSON.
Exact digest recomputed on used stored bytes. Tripwires keep same valid bytes
while actor, entity, version, deadline or context origin becomes invalid; prove
no GEN credit, settlement, permit or hard-state change except allowed retry.

Each temporal method deliberately leaves stored phase stale for deadline-1,
deadline equality, deadline+1. Value/recovery writes: wrong caller, wrong state,
duplicate, finalized/closed, no double-credit/withdraw/settle, unchanged accounting
on rejected invariants, emission failure rollback. Whole GEN positive and dust
negative payable tests. Cross-bundle isolation and 32-row pagination.

Deployment parser fixtures cover raw Studio and normalized SDK receipt shapes,
with SUCCESS required separately from accepted/finalized. Real-SDK selected
account adapter regression, browser local RPC and built app required. Current
30 local frontend cases now cover adapter/provider behavior and UI journeys.
Run npm run check after relevant changes; bounded unsigned smoke before real
2 GEN lifecycle; gltest/integration using matched supported target capability.
Do not fake unsupported mocks or silently skip required integration checks.

## Claim-to-code matrix

| Claim | Contract method/state | View/read | Test | Network evidence |
| --- | --- | --- | --- | --- |
| Coalition meanings drive marginal shares | review_bundle/PURCHASED | get_attempt, get_credit | Four vectors + semantic replay + conservation | evidence/studio-dev/lifecycle.md: live I/I/C gives 1/1 GEN; C/I/C gives 2/0 GEN; all recovered/closed PASS; other vectors local only |
| Exact roles and all-party agreement | offer_grant, ratify_bundle/READY | get_grant, get_bundle | Wrong actor/entity/digest/version tripwires | evidence/studio-dev/deployment.json: three distinct signed actors, immutable offers, assents=7 PASS |
| One buyer protocol use | consume_permit/CONSUMED | get_permit | Wrong holder, boundary and duplicate | Script and buyer browser FINALIZED/CONSUMED PASS in lifecycle.md and browser-wallet.json |
| Complete no-cover/expiry recovery | review_bundle/refund_expired/REFUNDED | get_credit, get_accounting | No-cover and partial/full assent expiry | deployment.json: gap and expiry CLOSED, buyer withdrew 2 GEN each, exact native decreases and zero liability PASS; browser recovery pending |
| Exact value exit and closure | withdraw_credit, close_bundle/CLOSED | Credit, accounting, native balances | Debit ordering, duplicate, orphan prevention | lifecycle.md and deployment.json: two exact native decreases of 1 GEN, recipient balance deltas, CLOSED, zero accounting/native balance PASS |
| Full product uses actual chain | All nine writes and canonical reads | Typed adapter, bounded views | UI exact-command/reload tests + real-SDK regression | frontend.md: local/hosted reads PASS; five buyer browser writes FINALIZED/SUCCESS; peer script actions separate |
| Builder reuse without judge fork | Documented single-contract interface | Bundle/grant/attempt/permit/credit views | Isolation + adapter compatibility | Public source and CI run 37553212901 PASS; source/schema parity verified; integration contexts proposed |

## Analogue and differentiation matrix

| Nearest analogue | Material matches | Different trust/judgment/state/consequence/reuse |
| --- | --- | --- |
| RankReserve | Multiparty actors and transaction-authored constitutive evidence (2) | No priority charter, senior tiers, face debts or scarce waterfall. Every coalition has semantic coverage; marginal coverage derives cooperative purchase shares and one bundle permit. |
| ConcordBatch | Constitutive transaction authority and single-use permission technique (2) | No conflicts, scheduling order, two-of-three selection or priority. A/B/AB coverage is monotone and every issuer's marginal contribution changes its share. Buyer receives one joint permit. |
| SkillSlot | Buyer/provider roles and authenticated offers (2) | No bipartite matching, scarce capacity, booking/delivery escrow or fixed offer prices. Complementary grants can jointly cover a goal while neither alone covers it. Coalition views expose marginal value. |
| DisclosureDividend | Semantic contribution allocation technique (1) | No vulnerability disclosure, post-hoc credit, sealed report or external performance evidence. Ex-ante positive grants create one purchased protocol authorization. |
| MandateMesh | Coverage classification and funded credits (2) | No official mandate tranches or independent plan rewards. Counterfactual subsets of grants determine complementarity/substitution and the shared permit. |
| GrantLattice / SemanticPolicyQuorum / CycleWarrant | Constitutive role-checked rights (1) | No attenuation tree, policy intersection, surrender, ownership rotation or barter. Purchased union coverage derives cooperative issuer shares. |
| Remaining registry and historical exclusions | Generic LLM/ledger features are not material identity | No >=4 matching material dimensions identified. No universal novelty claim. |

## Deployment and evidence plan

Studio Dev only, chain 61997 and coherent pinned runner/API. Network identity
includes source commit, runner, SDK, deployment transaction and active address.
Use existing authorized ignored root accounts for distinct buyer/A/B roles;
discover child .env then root .env safely and never print values. No new EOA
or funding transfer without separately required authorization. Do not faucet.

Resumable scripts bind a stable run/bundle ID, save projected safe transaction
metadata, read status/assents/phase/credit before every write, wait for SUCCESS
plus finalized canonical reads. Archive superseded identity/status/reasons,
never overwrite attempt evidence. Before funding any diagnostic revision define
all recoveries; broken contract exception requires explicit abandoned status and
no further value. Bounded smoke first, then complementary 2 GEN settlement,
dummy 2/0 GEN branch, no-cover refund and expiry recovery as required coverage.
Withdraw each 1/2 GEN credit, compare exact contract-native decrease and recipient
balance with fee treatment, consume/expire permit, close at zero liability.

Evidence under docs/evidence/studio-dev; local evidence separately under local.
Do not dump receipt/trace/config/stdout/stderr; use explicit safe allowlist.
Browser proof distinct from script-signed peer actions: every claimed browser
action has control/wrapper/test/finality/canonical reload and actual evidence.
No claimed missing peer browser action may be substituted by a demo script.
Before public push audit Git root/status/staged/history/allowlist/secrets/ignored
files. Public GitHub main and successful CI, Vercel production, real HTTP 200
body/app/root, full Projects precheck NO BLOCKER and final complete track audit.

## Definition of Done

Category Projects; do not weaken requirements or switch category.

- [x] Exactly one named reusable ASCII contract with pinned coherent header, lint PASS.
- [x] Independent semantic judgment and deterministic consequential settlement.
- [x] Direct/adversarial/metadata/parser tests and matched integration checks PASS.
- [x] npm run check includes contract, tests, real-SDK wallet regression, typecheck/build.
- [x] Finalized Studio Dev consequential lifecycle and recovery with exact GEN proof: complement, dummy, no-cover and pending expiry; semantic retry remains local-only proof.
- [x] Full buyer browser-wallet workflow plus expired-purchase refund, exact 2-GEN withdrawal and closure; canonical reads and browser RPC proof; issuer actions are script-signed.
- [x] Every claimed browser action has wrapper/control/test/finality/reload/evidence.
- [x] Meaningful multi-page product preserves baseline and exposes only user needs.
- [x] Public sanitized repository with meaningful commits and successful CI; each later public revision requires its own successful run.
- [x] Verified Vercel HTTP 200 app, real address/explorer links and final README.
- [x] Four-source authority audit with current canonical buyer/script evidence and explicit unproven branches.
- [x] Full grading command -Project coverweave -Category projects => 0 BLOCKER, 1 WARN; npm check and standalone gltest PASS, no SkipDynamic (2026-10-07).
- Workspace registry, prompt audit and submission-control records are maintained privately; Portal submission does not imply acceptance.

Local checks, live script consequence/recovery, hosted canonical reads and the
complete five-action buyer browser lifecycle and four-action expired-purchase
recovery are verified separately. The safe records retain the reverted envelope
and canceled refund, exclude both from successful counts and separate native
funding. Latest canonical evidence proves six CLOSED bundles, 50 successful
finalized intelligent transactions and 12 GEN received and withdrawn, with zero
liability and native balance. Browser semantic retry and browser permit expiry
are separate branches with local test coverage.

## Honest limitations

Newly constituted protocol permissions only; no external execution, legal/IP
authority or service delivery. Two issuers only. Whole
fixed 2 GEN purchase. No appeal or punitive state. Unsigned viability and mocked
frontend tests do not prove finalized consensus, value transfer or browser writes.
Studio Dev evidence is never mainnet or another network. Proposed consumers and
milestones are future work. Portal submission does not imply acceptance.

## Kill criteria

Reject if consequential external facts are introduced without an authoritative
source/verified origin; semantic validator cannot replay; meaningful verdict
remains unstable; >=4 material registry dimensions collide; value can be orphaned;
runtime/API compatibility cannot be proven; browser/SDK requires fake success;
or final precheck has a blocker. Redesign within gates before further execution.
Do not compensate with more UI, prompts, fabricated evidence or category change.

## Adoption path and milestone headroom

Three proposed integration contexts: ODRL permission-bundle workspace,
LangGraph multi-tool permission broker, DAOhaus joint-vendor authorization.
Each can call bundle/grant/assent/review views and consume a buyer permit without
forking the core semantic judge.

After an accepted version, extend to 3-5 issuers with full subset coverage,
exact rational Shapley shares and all rounding/monotonicity tests. Next, build
an authenticated gateway that actually consumes permits for one external tool.
Both add substantial functionality, build on accepted behavior, require an
explicit delta and new live/adoption evidence; neither is cosmetic repackaging.
