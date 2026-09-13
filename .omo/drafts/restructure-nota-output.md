---
slug: restructure-nota-output
status: approved
intent: clear
review_required: round 1 (high accuracy) COMPLETE - momus: APPROVE-WITH-NITS (4 nits, folded); oracle: CORRECTIONS REQUIRED (17 findings, folded) -> APPROVE-WITH-NITS (1 MEDIUM + 2 NITs, folded) -> APPROVE-WITH-NITS (NIT-1 leftover, folded). REVIEW PASSED | review-results: .omo/evidence/ | engaged: true
state-artifacts: .omo/plans/restructure-nota-output.md (written, self-reviewed, dual-reviewed, APPROVED) | .omo/evidence/ (filled during execution)
pending-action: EXECUTION COMPLETE - all 3 todos done (commits 63bb4fd + 4f46b4c, BASELINE d2504dc); full suite green (vitest 96/96, lint, types:check, build); scope guard = exactly 3 files; FINAL VERIFICATION WAVE (F1-F4) RUNNING - results in .omo/evidence/ | BASELINE captured: d2504dc9a81aeafd6d9475fdbdbc1d6aeae74182 (branch Fix-Security, clean tree except .omo/) in .omo/evidence/restructure-nota-baseline.txt
approved-at: 2026-09-14 (user: "okeay, dengan high-accuracy review")
approach: Restructure the nota output (UI display + thermal print) around labeled sections - BERAT (KG) / HARGA (RP) / HUTANG / PEMBAYARAN - with consistent units (every weight row ends "kg", every price row unit-less), applied identically to NotaThermal (Success.tsx) and the ESC/POS text builder (receipt-builder.ts) so browser print == Bluetooth raster == text fallback. Font sizes (PAPER_CLASSES) untouched; 57mm (32-col) line budget respected.
---

# Draft: restructure-nota-output

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
- C1 | NotaThermal (Success.tsx) restructured into labeled sections w/ consistent units | completed | resources/js/pages/Weighing/Success.tsx:78-357 (commit 63bb4fd)
- C2 | buildReceipt (receipt-builder.ts) aligned: adds sorting rows, TOTAL KOTOR, HUTANG section, signatures, closing line, same labels | completed | resources/js/lib/receipt-builder.ts:32-212 (commit 4f46b4c)
- C3 | buildReceipt test contract updated in printer-service.test.ts | completed | tests/JS/printer-service.test.ts:177-395 (commit 4f46b4c)
- C4 | Verification wave (format/lint/typecheck/vitest + manual debug-print preview) | completed | evidence in .omo/evidence/

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
- 57mm is the dominant paper; 80mm must still work | treat 57mm (32 cols) as the hard line budget for ESC/POS text; both UI sizes already share PAPER_CLASSES | user statement | n/a (user decision)
- Font sizes must not change | PAPER_CLASSES (Success.tsx:26-55) and buildReceipt size/bold calls stay as-is | user statement | n/a (user decision)
- Readers = farmer + cashier | labels full words (SEBELUMNYA, BAYAR, SISA), no abbreviations except established (BRUTO/TARE/NETTO) | user statement | n/a (user decision)
- UI display and printed nota equally important | both representations get the SAME restructure; no drift between them | user statement | n/a (user decision)
- Debt section visibility condition | show HUTANG section when previous_debt_amount > 0 OR debt_paid_amount > 0 (current UI gates only on paid>0, hiding "unpaid old debt" cases) | correctness default | yes - reversible by user at gate
- Sortiran money representation | TWO rows in HARGA section: `HARGA SORTIRAN: 500` + `TOTAL SORTIRAN: 23.750` (only if has_sorting) - REVISED from the earlier one-line default `SORTIRAN 47,5 kg @ 500: 23.750` because the one-liner is 38 chars on realistic values (e.g. 1.234,5 kg @ 1.750 -> 2.160.375) and would be truncated by justify() at the 32-col 57mm budget; two rows mirror the HARGA SAWIT/TOTAL SAWIT pattern and keep the farmer able to verify 47,5 x 500 = 23.750 | Metis gap analysis (CON-1, 32-col overflow) | yes - reversible by user at gate
- Multi-load nota | keep existing RINCIAN MUATAN per-load block (Success.tsx:142-197) as-is, then always render the aggregate BERAT/HARGA/HUTANG sections from transaction-level fields | preserves detail while adding structure | yes

## Findings (cited - path:lines)
- NotaThermal renders the nota for THREE outputs at once: UI display, browser @media print, and Bluetooth raster capture (captureNotaBitmap in printer-service.ts:480-499 clones the DOM element). Restructuring NotaThermal therefore fixes UI + browser print + raster in one change.
- The ESC/POS text fallback (buildReceipt) is used when raster fails (printer-service.ts:497-499 fall through) and in debug mode (printer-service.ts:422). It is a SEPARATE render and is currently missing rows the UI shows: sorting money rows (POTONGAN SORTIRAN / SORTIRAN amount), TOTAL KOTOR (gross_total_amount), the whole HUTANG section, KASIR/PETANI signatures, and the closing thanks line. Print != display today for sorting + debt transactions.
- Confusing labels confirmed in current UI (Success.tsx): `NETTO KOTOR:` (single-load path, :209) vs `NETTO BERSIH:` (:192, :221) - two different concepts with inconsistent names; kg rows inside the money block - `POTONGAN SORTIRAN (5%): -2.5 kg` (:249-254) and `SORTIRAN (47.5):` where the (47.5) is kg but the value is Rp (:256-265); `TOTAL KOTOR:` whose value is Rupiah but reads weight-ish (:268-276).
- Debt section is gated on `debt_paid_amount > 0` only (Success.tsx:280) - a farmer with previous debt > 0 who paid 0 this trip sees no debt info at all, yet final_paid_amount already subtracted debt_paid_amount (0) - so remaining debt is invisible on the nota.
- buildReceipt test contract (tests/JS/printer-service.test.ts): align sequence exactly ['center','left','center','left'] (:283); >= 3 rules (:291); every text line <= 32 chars on 58mm (:294-303); size(1) on 32 cols (:305-311), size(2) on 48 cols (:313-319); `#1 SORTIRAN: -100 kg` on sorting tx with per-load data (:361-394); PETANI right-anchored (:349-359); NB wording (:336-347). ANY receipt change must keep these or explicitly update them.
- Data available on WeighingTransaction (resources/js/types/domain.ts:44-88): gross/tare/initial/deduction/net weights, palm price+total, sorting price/deduction%/net/sorting_total_amount, gross_total_amount, previous_debt_amount/debt_paid_amount/remaining_debt_amount, final_paid_amount(_rounded), payment_method. Loads carry per-load weights (domain.ts:25-42).
- Calculation semantics (resources/js/lib/utils.ts): net = initial - deductionWeight - sortingWeight (:154); grossTotal = palmTotal + sortingTotal (:197); finalPaid = grossTotal - debtPaid (:202). Verify numbers for plan fixtures: 1000/100, 5% → netto awal 900, potongan 45, sortiran 50 → netto sawit 805; 805 x 2000 = 1.610.000; sortiran 47.5 x 500 = 23.750; TOTAL KOTOR 1.633.750; hutang 200.000 → diterima 1.433.750.
- No backend/DB/migration involved - all fields already persisted. No component test runner (vitest only, no RTL) - UI verified via types:check/lint/build + manual browser check.
- Metis gap analysis (CON-1, HIGH): the announced one-line sortiran format `SORTIRAN 47,5 kg @ 500: 23.750` (30 chars) overflows at realistic values - `SORTIRAN 1.234,5 kg @ 1.750: 2.160.375` = 38 chars > 32 → justify() (receipt-builder.ts:22-30) truncates the TOTAL. Resolved: two rows HARGA SORTIRAN / TOTAL SORTIRAN (each <= 25 chars at any realistic value).
- Metis (CON-2): id-ID decimal separator is COMMA - fixtures/tests/UI strings must use `47,5` (dot is only the thousands separator, e.g. `23.750`). Draft math lines above use dot notation as formulas - rendered strings use commas.
- Metis (CON-3): @point-of-sale/receipt-printer-encoder `rule()` is solid-only; ESC/POS text path cannot render CSS dashed/dotted. "Dotted within" is a UI-only detail (existing dashed Divider); text path uses rule() (solid) only between sections - never claim pixel-parity for separators across paths.
- Metis (MISS-2): adding CENTER-aligned signatures in buildReceipt would break the align-seq test (['center','left','center','left'] exact, printer-service.test.ts:283) - resolved: signatures use justify() (left), no new align() calls → align-seq unchanged.
- Metis (MISS-3): HUTANG visibility needs 3 test cases (prev>0+paid>0, prev>0+paid=0, both 0). (MISS-4): bold-state assertions must reconstruct state from encoder.bold()/bold(false) call log. (MISS-11): run the FULL vitest suite (4 files) + build, not just the one test file. (MISS-7): thanks line `Terima kasih atas kepercayaannya` is exactly 32 chars - pin the exact string.

## Decisions (with rationale)
- D1: Adopt Opsi A (user-approved): labeled sections BERAT (KG) / HARGA (RP) / HUTANG / PEMBAYARAN; solid full-width separator between sections, dotted within; bold only key figures (NETTO SAWIT, TOTAL KOTOR, TOTAL DITERIMA, SISA HUTANG); kg suffix on all weight rows; price rows unit-less.
- D2: Single-source consistency - the SAME section layout and labels go into NotaThermal AND buildReceipt, so ESC/POS text output matches what appears on screen / in browser print / in raster.
- D3: BERAT (KG) section - aggregate rows always rendered from transaction fields (multi-load: preceded by unchanged RINCIAN MUATAN block): BRUTO, TARE (MOBIL), NETTO AWAL (renamed from NETTO KOTOR), POTONGAN 5%, SORTIRAN (gross, negative), NETTO SAWIT (renamed from NETTO BERSIH).
- D4: HARGA (RP) section: HARGA SAWIT, TOTAL SAWIT, then (if sorting) TWO rows `HARGA SORTIRAN: <price>` + `TOTAL SORTIRAN: <amount>` (REVISED: replaces the earlier single-line `SORTIRAN 47,5 kg @ 500: 23.750` which overflows the 32-col budget on realistic values - the 4-section UI uses dotted separators between BERAT and HARGA, keeping the price block free of kg rows), then TOTAL KOTOR (bold).
- D5: HUTANG section shown when previous_debt_amount > 0 OR debt_paid_amount > 0; rows HUTANG SEBELUMNYA / BAYAR HUTANG (-) / SISA HUTANG (bold) - same as current labels (:284-302) but now also appearing when paid == 0 and old debt exists.
- D6: PEMBAYARAN = boxed TOTAL DITERIMA + METODE: TUNAI/TRANSFER BANK (unchanged behavior, Success.tsx:308-324).
- D7: buildReceipt gains rows missing vs UI: aggregate BERAT rows after any per-load block, sorting money line, TOTAL KOTOR, HUTANG section, KASIR/PETANI signature lines, and closing `Terima kasih atas kepercayaannya` - all fitted to the caller's column budget (32/42/48) with existing justify/fit helpers.
- D8: Debt-section row labels stay Indonesian full words (user's reader mix); keep NB wording untouched (test-locked at :336-347).
- D9: No font changes: PAPER_CLASSES and buildReceipt size() calls unchanged; new lines must fit 32 cols on 57mm (test enforces).

## Scope IN
- C1: NotaThermal section restructure in resources/js/pages/Weighing/Success.tsx (rows 139-305: weights, prices, debt blocks; final box unchanged).
- C2: buildReceipt alignment in resources/js/lib/receipt-builder.ts (add rows between NETTO BERSIH/rule and TOTAL DITERIMA; add signatures + thanks before cut).
- C3: Update tests/JS/printer-service.test.ts buildReceipt expectations (align seq if it changes; add assertions for new rows: NETTO AWAL, NETTO SAWIT, SORTIRAN money line, TOTAL KOTOR, HUTANG rows, KASIR/PETANI, thanks line; keep 32-col truncation + NB + size tests intact).
- C4: Run verification: `npm run format` + `npm run lint` + `npm run types:check` + `npx vitest run tests/JS/printer-service.test.ts`; manual check of Success page on a sorting+debt transaction (57mm and 80mm toggle) and the debug-mode decoded ESC/POS text (printer-service.ts:414-448 debug branch).

## Scope OUT (Must NOT have)
- No backend/PHP/controller/migration changes - data model already has every field needed.
- No font-size changes (PAPER_CLASSES Success.tsx:26-55 remains byte-identical; buildReceipt size() calls unchanged).
- No changes to calculation logic (utils.ts already correct after fix-sortiran-gross-weight).
- No new dependencies, no component-test framework install.
- No changes to header/branding, NOTA title, nota number block, signatures section of the UI, NB wording, or the print CSS block (Success.tsx:589-625).
- No changes to RINCIAN MUATAN per-load block beyond keeping it as-is.
- No rounding-mode or payment-method behavior changes.

## Open questions
- None blocking. All forks resolved by exploration + user's brainstorm answers (gate above allows veto of announced defaults if desired).

## Approval gate
status: awaiting-approval
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
- Previously-on: ULW-PLAN MODE ENABLED; intent CLEAR announced; approval brief presented below; waiting for user's explicit okay.
- Next action after okay: write .omo/plans/restructure-nota-output.md (run scaffold without --draft-only), append task batches into ## Todos, then handoff for $start-work.