# PAYG credits and Puntr Pro: unit economics (14 Nov 2026)

Owner brief: charge accurately for credit packs and set the Pro fee so margins can be modest but are never eaten by heavy use or bad arithmetic.
The model is `src/lib/economics.ts`; `src/lib/economics.test.ts` fails if any pack or the Pro plan drops under its margin floor. Change a rate, re-run the tests.

## Inputs (check before launch)
| Input | Value | Source / status |
|---|---|---|
| Gemini 3.8 Flash (primary, paid) | $0.375 in, $1.875 out per 1M tokens | ai.google.dev/gemini-api/docs/pricing, 14 Nov 2026 |
| Gemini 3.5 Flash (dearest on the allow-list) | $1.50 in, $9.00 out per 1M tokens | same; used as the worst case if every call falls back to it |
| USD/ZAR | R18.50, stress R22 | **Assumption.** Update on 28 Nov when the paid tier is switched on |
| PayFast card | 3.2% + R2.00 ex VAT | payfast.io/fees |
| PayFast Instant EFT | 2% (min R2.00) ex VAT | payfast.io/fees |
| PayFast payout | R8.70 ex VAT per withdrawal | third-party summary, 2026. **Confirm on the merchant account.** Modelled as one payout per 20 payments |
| VAT on PayFast fees | 15%, treated as a cost | Puntr is assumed not VAT-registered |
| Grounded search | $14 per 1,000 requests after 5,000 free a month | Not used by member features; keep it off |

Token use per action (output is capped in code, so these are ceilings): preview 8,000 in / 1,500 out; slip 2,500 in / 2,048 out; insight 6,000 in / 1,200 out; deep stats no AI.

## AI cost per action
| Action | Credits | Cost on 3.8 Flash | Cost on 3.5 Flash (worst) | Worst cost per credit |
|---|---|---|---|---|
| AI match preview | 5 | R0.11 | R0.47 | R0.09 |
| Betting-slip analysis | 3 | R0.09 | R0.41 | R0.14 |
| Match intelligence report | 2 | R0.08 | R0.37 | R0.18 |
| Tipster deep stats | 2 | R0 | R0 | R0 |

AI is cheap. The real costs are PayFast's fixed R2 plus VAT, and an unlimited plan with no cap.

## Credit packs (current prices kept)
Margin = (price − PayFast fee incl. VAT − payout share − worst-case AI if every credit goes on the dearest action) ÷ price.

| Pack | Price | Credits | Per credit | Card fee | Worst margin (card) | Expected margin (card, 3.8 Flash) | Worst margin (EFT) |
|---|---|---|---|---|---|---|---|
| Starter | R25 | 25 | R1.00 | R3.22 | 66.8% | 81.0% | 70.5% |
| Matchday | R60 | 65 | R0.92 | R4.51 | 71.8% | 87.1% | 75.5% |
| Season | R120 | 140 | R0.86 | R6.72 | 72.6% | 89.1% | 75.9% |

Floor enforced: 60% worst case, at R18.50 and R22 per dollar, card and EFT. **Recommendation: keep the three packs.** The cheapest viable Starter price at the floor is R20.32, so R25 has headroom. Do not sell a pack under R20, because R2 plus VAT is too large a share of it. Unused credits are extra margin and are not counted.

## Puntr Pro (R99 a month)
Card fee R5.94 incl. VAT leaves R93.06. Pro stays "unlimited" in the interface but needs a server-side fair-use stop:

- **90 AI actions a month, 15 a day** (`PRO_FAIR_USE`). Worst case (every action a preview on the dearest model) costs R42.46, a 51% margin. Expected cost is R9.68, an 84% margin.
- The cap formula: net after fees × allowed share ÷ worst cost per action. A 30% share gives 59 actions, 50% gives 98.
- Wording: "fair use applies" on the pricing page. Pro does not buy a higher rank or prize eligibility (already stated).
- The Annual Pass (R299 for 12 months, 20 places) is R24.92 a month. Same 90-action cap: worst-case AI R42 a month exceeds the R24.92 it brings in per month, so apply a **tighter 40-action cap** to Annual Pass members. Expected cost at 40 actions is R4.30. The 20-place cap limits the exposure to about R850 a month in the worst case.

## Before PAYG goes live
1. **Price table mismatch:** `/pricing` shows preview 5, slip 3, stats 2. The database `credit_prices` has ai_preview 3 (inactive), match_insight 2, tipster_deep_stats 1. Choose one set and make both match.
2. **Paid-tier switch on 28 Nov:** set `USD_ZAR`, re-run the tests, and keep the router allow-list as is.
3. **VAT:** if Puntr registers for VAT, the prices include VAT and the margins fall by about 13 points (Starter worst case drops to about 54%, under the floor). Re-price before registering.
4. **Refunds:** a refunded payment still costs the PayFast fee (R2 refund fee on the data seen). Keep the `/refunds` terms on unused credits only.
5. **Fixed costs** (Supabase, Vercel, Parallel $50 balance, Resend) are not per credit. Break-even is the monthly fixed cost divided by the average net per pack, about R40.
6. Add `[attorney review]` copy and the checkout only in the PayFast task; nothing here changes what members see.
