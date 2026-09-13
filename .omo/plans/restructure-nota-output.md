# restructure-nota-output - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** The nota farmers receive (on screen and when printed on the receipt printer) will show four clearly-labeled sections — weight (all in kg), price (in Rupiah), any outstanding debt, and the payment box — with the same layout everywhere, and the printed version will no longer silently drop the sorting-price rows, the debt section, the signatures, or the closing thanks line.

**Why this approach:** There are two separate renderers for the same nota (the web page and the printer text) and they disagree today — the printed one is missing a lot. Opsi A (labeled sections with consistent units) was chosen because it's what the farmer and cashier can read at a glance on a narrow 57mm receipt, and it's purely a layout change: zero calculation or database changes. The one format correction forced by review (sortiran price as two rows instead of one long line) keeps every printed line inside the 32-character width a 57mm receipt allows.

**What it will NOT do:** No changes to any prices, weights, or math; no changes to fonts/sizes on the receipt paper; no changes to login, forms, or the database; no new software packages; and nothing outside the nota display files and their tests.

**Effort:** Short
**Risk:** Low - display-only change, fully covered by the existing receipt tests plus new ones, with the narrow-paper width as the main constraint (already handled)
**Decisions to sanity-check:** (1) Sortiran price shown as two rows (HARGA SORTIRAN + TOTAL SORTIRAN) instead of the one-line format shown in the earlier draft — the one-liner overflows 32 chars on realistic numbers; (2) the debt section now also appears when there's old unpaid debt (not only when debt was paid today); (3) only total figures are bold (weight/price rows are regular); (4) "NETTO KOTOR"/"NETTO BERSIH" renamed to NETTO AWAL/NETTO SAWIT for clarity.

Your next move: high-accuracy review is COMPLETE and APPROVED (momus APPROVE-WITH-NITS; oracle APPROVE-WITH-NITS after two correction rounds — all findings folded; recorded in .omo/drafts/restructure-nota-output.md). BASELINE is captured (d2504dc, branch Fix-Security, `.omo/evidence/restructure-nota-baseline.txt`). Execute via `$start-work` — the USER must run it (fresh worker session; the planner session is plan-file-only and cannot dispatch implementers). Full execution detail follows below.

---

> TL;DR (machine): 3 todos, 2 waves, 3 files, 0 new deps; labeled nota sections (BERAT/HARGA/HUTANG) with consistent units in UI + ESC/POS paths; receipt gains sortiran rows/TOTAL KOTOR/HUTANG/signatures/thanks; no math or font changes; Short effort, Low risk, high-accuracy review required.

## Scope
### Must have
- Nota output (UI display on Weighing Success page + printed thermal nota) restructured into labeled sections: **BERAT (KG)** / **HARGA (RP)** / **HUTANG** / PEMBAYARAN (boxed TOTAL DITERIMA). Identical layout + labels in BOTH render paths: NotaThermal (resources/js/pages/Weighing/Success.tsx) and buildReceipt (resources/js/lib/receipt-builder.ts, ESC/POS text fallback).
- Canonical layout (section headers in bold; solid full-width separator BETWEEN sections; dotted separator WITHIN sections; kg suffix on every weight-row value; price rows unit-less; bold only key figures NETTO SAWIT / TOTAL KOTOR / SISA HUTANG / TOTAL DITERIMA):

  ```
  BERAT (KG)
  BRUTO: 1.000 kg
  TARE (MOBIL): 100 kg
  NETTO AWAL: 900 kg                       (was NETTO KOTOR; new aggregate row in multi-load)
  POTONGAN (5%): -45 kg                    (only if has_deduction; label keeps parens)
  SORTIRAN (5%): -50 kg                    (only if has_sorting; pct=sorting_deduction_percentage; "SORTIRAN:" if pct<=0; gross weight, negative)
  NETTO SAWIT: 805 kg                      (was NETTO BERSIH) [bold]
  ──────────────────── (solid)
  HARGA (RP)
  HARGA SAWIT: 2.000                       (was HARGA/KG:)
  TOTAL SAWIT: 1.610.000
  HARGA SORTIRAN: 500                      (only if has_sorting)      <- two-row format replaces the single-line
  TOTAL SORTIRAN: 23.750                   (only if has_sorting; value = sorting_total_amount)   "SORTIRAN 47,5 kg @ 500: 23.750"
  TOTAL KOTOR: 1.633.750                   (gross_total_amount) [bold]
  ──────────────────── (solid, only when HUTANG visible)
  HUTANG
  HUTANG SEBELUMNYA: 200.000
  BAYAR HUTANG (-): 200.000
  SISA HUTANG: 0                           [bold]
  ──────────────────── (solid)
  ┌─ TOTAL DITERIMA ─┐  Rp 1.433.750 / METODE: TUNAI   (box unchanged)
  KASIR: <name>                           (two separate lines in the receipt; UI signature block unchanged)
  PETANI: <name>
  NB: ... (4 lines unchanged) / Terima kasih atas kepercayaannya
  ```
  id-ID formatting everywhere (decimal comma: `47,5`; dot thousands separator: `1.995.000`). Verify numbers for the fixture: 1000/100, deduction 5%, sorting 50 @ 5% → NETTO AWAL 900, POTONGAN -45, SORTIRAN -50 → NETTO SAWIT 805; 805×2000 = 1.610.000; sortiran net 47,5×500 = 23.750; TOTAL KOTOR 1.633.750; hutang 200.000 → diterima 1.433.750. NOTE (fixture branch semantics): canonical numbers hold for the SINGLE-LOAD path (calculateTransaction) AND for a one-load `loads[]` whose per-load values match the tx fields exactly (calculateLoads per-load sums = tx values). All new tests must construct fixtures accordingly: single-load tests omit/empty `loads` and set tx fields directly; multi-load tests (sorting fixture, 32-col realistic fixture, HUTANG cases where listing per-load context matters) pass a one-element loads[] consistent with the tx fields - do NOT pass partially conflicting loads (values asserted are tx-level: sorting_total_amount, gross_total_amount, remaining_debt_amount).
- HUTANG section visible when `previous_debt_amount > 0` **OR** `debt_paid_amount > 0` (both render paths; fixes the hidden-old-debt bug).
- buildReceipt gains the rows it currently lacks vs the UI: aggregate BERAT rows (multi-load), HARGA SORTIRAN / TOTAL SORTIRAN, TOTAL KOTOR, whole HUTANG section, KASIR/PETANI signature lines, closing "Terima kasih atas kepercayaannya".
- buildReceipt keeps: align sequence exactly `['center','left','center','left']` (signatures via justify(), no new align calls), `>= 3` rule() calls, first size() call `2` at 48 cols / `1` at 32 cols, per-load RINCIAN MUATAN block byte-equivalent, every text line <= 32 chars at columns=32 (existing test + new realistic fixture), existing NB wording, `#1 SORTIRAN: -100 kg` load line.
- Update tests/JS/printer-service.test.ts: existing buildReceipt assertions that still hold stay; add new-row, HUTANG-visibility (3 cases), bold-state, 32-col-with-sorting+debt, signature, thanks-line assertions.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO font-size changes: PAPER_CLASSES (Success.tsx:26-55) byte-identical; buildReceipt size() calls unchanged.
- NO change to Row component's `bold = true` default (Success.tsx:57-72) - de-bold via per-row `bold={false}` only.
- NO backend/PHP/controller/migration/route/wayfinder changes (resources/js/routes/** is auto-generated - untouched).
- NO changes to calculation logic (resources/js/lib/utils.ts, WeighingTransaction::calculate*) - numbers are already correct.
- NO changes to header/branding block (:99-111), info block (:113-137), per-load RINCIAN MUATAN rows (Success.tsx:142-183; receipt-builder.ts:93-137), signatures section UI (:326-344), NB wording, TOTAL DITERIMA box content (:308-324), print CSS (:589-625), paper toggle (:529-555), use-printer hook, printer-service.ts (incl. debug branch columns:48), receipt-raster.ts, package.json. NOTE: Success.tsx:184-196 (current aggregate POTONGAN/NETTO BERSIH rows) IS in scope - it becomes the aggregate BERAT section; only :142-183 per-load rows are frozen.
- NO new dependencies; NO new files (no shared label-constants module - duplicate strings in both paths); NO test-framework additions (vitest only, no RTL).
- NO changes to Form.tsx or the debt display there.
- NO adding a sorting-deduction row (2,5 kg) anywhere - the 50 gross / 47,5 net relationship stays implied by HARGA/TOTAL SORTIRAN rows.
- POTONGAN SORTIRAN row and the old `SORTIRAN (xx):` money line are REMOVED from the HARGA block (replaced by HARGA SORTIRAN + TOTAL SORTIRAN).
- git diff --name-only (excluding .omo/) must show EXACTLY: resources/js/pages/Weighing/Success.tsx, resources/js/lib/receipt-builder.ts, tests/JS/printer-service.test.ts.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after for receipt builder (vitest, existing file tests/JS/printer-service.test.ts); none for UI (no component-test runner - verified: vitest only, no RTL in package.json) - UI acceptance via lint + types:check + build + grep assertions + F3 manual QA.
- Evidence: .omo/evidence/task-<N>-restructure-nota-output.txt (N = todo number; attemptDir = currentAttemptDir from 'omo ulw-loop status --json', .omo/evidence/ulw/<session>/<goalId>/a<attempt>; outside ulw-loop use .omo/evidence/)
- Commands used everywhere: `npm run format` (prettier), `npm run lint`, `npm run types:check`, `npm run build`, `npx vitest run tests/JS/printer-service.test.ts`, `npm run test:js` (full vitest suite = 4 files).

## Execution strategy
### Parallel execution waves
- Wave 1 (parallel): Todo 1 (UI Success.tsx) + Todo 2 (buildReceipt + tests) - disjoint file sets, MUST copy the identical canonical layout table above (labels are the contract).
- Wave 2 (sequential after 1+2): Todo 3 (full-suite verification + scope guard + evidence).
- HANDOFF NOTES for the executor: (1) BASELINE is ALREADY captured - d2504dc9a81aeafd6d9475fdbdbc1d6aeae74182, branch Fix-Security, recorded in `.omo/evidence/restructure-nota-baseline.txt` (captured 2026-09-14 BEFORE any restructure commits); do NOT re-capture, but re-verify it still equals `git rev-parse HEAD` before Todo 1 commits. (2) `.omo/boulder.json` exists with the plan's work entries - the executor's Phase 2 should ADD a `restructure-nota-output` work (or re-create from scratch if the planner session could not write it - the planner session was blocked from writing non-.md files, boulder.json may be stale).

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | - | 3 | 2 |
| 2 | - | 3 | 1 |
| 3 | 1, 2 | - | - |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Restructure NotaThermal UI into labeled sections (BERAT/HARGA/HUTANG) in Success.tsx
  What to do / Must NOT do:
  - Add a section-heading render (bold, c.heading style - mirror the existing "RINCIAN MUATAN" heading at Success.tsx:144) for literals `BERAT (KG)`, `HARGA (RP)`, `HUTANG`.
  - Add `SolidDivider` - a full-width solid-border Divider variant (keep the existing dashed `Divider` for header :106 and footer :346). Use solid dividers at the three section boundaries: before BERAT section (:139), between BERAT and HARGA (:229), between HARGA and HUTANG (:281-282 - replaces the current dashed Divider at :282), and add one solid divider between HUTANG and the TOTAL DITERIMA box (:305) so every section boundary is solid; within-section spacing stays as-is.
  - Weights block (:141-227): if `loads.length > 0`, keep the per-load RINCIAN MUATAN block byte-identical **:142-183** (= heading ':144-146' + per-load rows ':147-183' - SORTIRAN ':167-176' and NETTO ':177-181' included, do NOT touch them), then insert a dashed `Divider` (within-section, like the existing ones), then render the aggregate BERAT section: header `BERAT (KG)` + rows BRUTO (transaction.gross_weight, **bold={false}**), TARE (MOBIL) (transaction.tare_weight, **bold={false}**), NETTO AWAL (transaction.initial_weight, NEW aggregate row, **bold={false}**), POTONGAN (x%) (**bold={false}**; if has_deduction; label keeps parens - currently rendered at :184-189, which is the region being restructured: MOVE that row INTO the aggregate section, no duplication), SORTIRAN (x%) (**bold={false}**; if has_sorting; label = `SORTIRAN (N%)` when sorting_deduction_percentage > 0 else `SORTIRAN`; value = gross sorting weight with negative sign, e.g. `-50 kg`), NETTO SAWIT (transaction.net_weight, bold - renames the current NETTO BERSIH row :190-196, which is ALSO part of the restructured region; no duplicate NETTO rows). If `loads.length === 0`, render the same BERAT section directly (replaces the current BRUTO/TARE/NETTO KOTOR block :198-227; same bold={false} rows; remove the separate NETTO BERSIH row).
  - Prices block (:231-277): header `HARGA (RP)` + rows HARGA SAWIT (:233-238, **remove bold** - currently bold via the Row default at :233), TOTAL SAWIT (:239-245, **remove bold** - currently bold at :244), if has_sorting (:246-267 is the `{transaction.has_sorting && (` conditional containing the old POTONGAN SORTIRAN row :248-255 and the old SORTIRAN money row :256-265 - REMOVE both, they are replaced by the two new rows): HARGA SORTIRAN (sorting_price_per_kg, NEW row, not bold) and TOTAL SORTIRAN (sorting_total_amount, NEW row, not bold) - **two rows, NOT the single-line `SORTIRAN 47,5 kg @ 500: 23.750` format** (overflows 32 cols on realistic values); then TOTAL KOTOR (:268-276, gross_total_amount, bold - unchanged).
  - Debt block (:279-305): condition -> `transaction.previous_debt_amount > 0 || transaction.debt_paid_amount > 0` (currently gates only on paid>0, hiding unpaid old debt); add header `HUTANG`; rows HUTANG SEBELUMNYA (bold={false}), BAYAR HUTANG (-) (bold={false} - de-bold: it is currently bold at :295, value stays positive `200.000`), SISA HUTANG (keep bold - default true; value stays `transaction.remaining_debt_amount`, do NOT recompute). The debt block IS being modified in this todo (bold swap only) - value formatting and row labels stay identical to current (:284-302).
  - Insert a `SolidDivider` immediately before the TOTAL DITERIMA box (:308) - ALWAYS rendered (it separates the last data section from PEMBAYARAN whether or not HUTANG is visible); do not put it inside the debt conditional.
  - Do NOT touch: PAPER_CLASSES (:26-55), Row default bold (:57-72), header/info blocks (:99-137), per-load rows (:142-183), TOTAL DITERIMA box (:308-324), signatures (:326-344), NB (:346-360), print CSS (:589-625), the `formatKg`/`formatRupiah` helpers imported from @/lib/utils (Success.tsx has no local formatter helpers - use the imported ones).
  Parallelization: Wave 1 | Blocked by: - | Blocks: 3
  References (executor has NO interview context - be exhaustive): resources/js/pages/Weighing/Success.tsx:26-360 (PAPER_CLASSES 26-55, Row 57-72, header 99-111, info 113-137, per-load 142-183 = heading 144-146 + rows 147-183, weights aggregate region 141-227, prices 231-277, debt 279-305, box 308-324, signatures 326-344, NB 346-360, print CSS 589-625); resources/js/lib/utils.ts (formatKg / formatRupiah imports - use existing, DO NOT touch their bodies); resources/js/types/domain.ts:44-88 (all tx fields incl. previous_debt_amount, debt_paid_amount, remaining_debt_amount, sorting_deduction_percentage, sorting_total_amount, gross_total_amount, net_weight, initial_weight); resources/js/lib/utils.ts:154,197,202 (formulas - DO NOT touch)
  Acceptance criteria (agent-executable): `npm run lint` exit 0 && `npm run types:check` exit 0 && `npm run build` exit 0; `grep -n "BERAT (KG)" resources/js/pages/Weighing/Success.tsx` matches >= 1; `grep -n "HARGA (RP)" ...` >= 1; `grep -n "HUTANG" ...` >= 1; `grep -n "NETTO AWAL" ...` >= 1; `grep -n "NETTO SAWIT" ...` >= 1; `grep -c "TOTAL SORTIRAN" ...` >= 1; `grep -c "POTONGAN SORTIRAN" ...` == 0 (removed); `grep -n "previous_debt_amount > 0 || transaction.debt_paid_amount > 0" ...` == 1 (exact condition line); `grep -n "SolidDivider" ...` >= 3
  QA scenarios (name the exact tool + invocation): happy = run the 3 commands + 8 greps above, append outputs to evidence file. failure = comment out the `|| transaction.debt_paid_amount > 0` clause, rerun the condition grep -> asserts the exact line (will fail), revert. Evidence .omo/evidence/task-1-restructure-nota-output.txt
  Commit: Y | refactor(nota): seksi berlabel BERAT/HARGA/HUTANG + satuan konsisten di NotaThermal

- [x] 2. Align buildReceipt with canonical layout (sortiran rows, TOTAL KOTOR, HUTANG, signatures, thanks) + update tests
  What to do / Must NOT do:
  - Implement the EXACT canonical layout table from ## Scope (same labels/values as Todo 1) in buildReceipt (resources/js/lib/receipt-builder.ts:32-212) for BOTH branches (loads.length > 0 and single-load).
  - Order of operations after the info block (+ existing rule at :59/:67/:91 stay): if loads.length > 0 -> per-load RINCIAN MUATAN block byte-identical (:93-137); then `rule()` -> bold `BERAT (KG)` -> BRUTO: gross_weight kg, TARE (MOBIL): tare_weight kg, NETTO AWAL: initial_weight kg, [POTONGAN (x%): -deduction kg if has_deduction], [SORTIRAN (x%): -sorting_weight kg if has_sorting (label = `SORTIRAN (N%)` when sorting_deduction_percentage > 0, else `SORTIRAN` - same fallback as the canonical table and Todo 1)], NETTO SAWIT: net_weight kg (bold end); `rule()` -> bold `HARGA (RP)` -> HARGA SAWIT: palm_price_per_kg (bold off), TOTAL SAWIT: palm_total_amount (bold off), [HARGA SORTIRAN: sorting_price_per_kg if has_sorting], [TOTAL SORTIRAN: sorting_total_amount if has_sorting], TOTAL KOTOR: gross_total_amount (bold); if `previous_debt_amount > 0 || debt_paid_amount > 0`: `rule()` -> bold `HUTANG` -> HUTANG SEBELUMNYA: previous_debt_amount (bold off), BAYAR HUTANG (-): debt_paid_amount (bold off), SISA HUTANG: **tx.remaining_debt_amount** (bold); `rule()` -> TOTAL DITERIMA block EXACTLY as current (:184-196: align center + bold + size + "TOTAL DITERIMA", "Rp " + formatted, "METODE: " + method, then align left) -> `.text('')` -> signature lines via justify() (left-aligned, NO new align() calls): `KASIR: <name>` and `PETANI: <name>` where KASIR name = `tx.cashier_name_snapshot` and PETANI name = `tx.farmer_name_snapshot` (the type has NO petani_name field; buildReceipt has NO access to auth.user - use the snapshot fields, which is what Success.tsx:332/:340 uses; if the snapshot is null/empty use `-`), each name truncated via fit() (e.g. `fit(name, columns - 8)` for the 8-char "PETANI: " prefix) so the line stays <= 32 cols -> `.text('')` -> existing NB 4-line block (:197-204) -> `Terima kasih atas kepercayaannya` via fit() (= exactly 32 chars, verified; fit() only truncates > 32) -> `.text('')` -> cut/feed unchanged.
  - The current buildReceipt has **NO sortiran money rows to remove** - the per-load SORTIRAN weight line (:111-124) stays byte-identical. The restructure replaces: the single-load branch rows BRUTO/TARE/NETTO KOTOR (:138-156) and the pre-box POTONGAN (:158-166) / NETTO BERSIH (:168-171) rows - they become the aggregate BERAT + HARGA sections (POTONGAN moves INTO the BERAT section, NETTO BERSIH is renamed NETTO SAWIT, no duplication). Net effect: add HARGA SORTIRAN/TOTAL SORTIRAN rows, add TOTAL KOTOR row, add HUTANG section, add signatures + thanks.
  - MUST keep: align sequence exactly `['center','left','center','left']` (no new align calls anywhere); >= 3 rule() calls (now >= 5); first size() call 2 @48 / 1 @32; per-load block byte-identical; every line <= 32 cols at columns=32; helper output via fmtAmount/fmtKg with id-ID commas (47,5 not 47.5).
  - Update tests/JS/printer-service.test.ts (existing assertions at :177-395 that still hold stay unchanged): ADD (a) HUTANG visibility 3 cases - prev>0+paid>0 renders all 3 rows, prev>0+paid=0 renders (esp. SISA HUTANG = prev), both 0 -> no line === 'HUTANG' and no startsWith('HUTANG SEBELUMNYA'); (b) sorting fixture (like :361-394): assert 'HARGA SORTIRAN: 500', 'TOTAL SORTIRAN: 47.500' (dot = thousands separator, correct id-ID), and aggregate 'SORTIRAN (5%): -100 kg'; (c) 32-col fit with realistic sorting+debt: sorting_weight 1200 @ 1.750 (net 95% = 1.140 -> 'TOTAL SORTIRAN: 1.995.000'), deduction 5%, prev 1.000.000 paid 200.000 -> 'SISA HUTANG: 800.000', assert every text line <= 32 chars; (d) bold-state assertions: reconstruct bold state from encoder.bold()/bold(false) call log - assert NETTO SAWIT / TOTAL KOTOR / SISA HUTANG(3-case fixture) / TOTAL DITERIMA bold; HARGA SAWIT / TOTAL SAWIT / BRUTO / HUTANG SEBELUMNYA NOT bold; (e) signature lines: the info block ALREADY emits justified lines like 'PETANI: BUDI SANTOSO' (printer-service.test.ts:349-359), so a plain startsWith/present assertion is weak and passes even if signatures are missing - assert the signature lines appear AFTER the 'METODE:' line (i.e., after the box) or assert count >= 2 occurrences of the 'PETANI: BUDI SANTOSO' / 'KASIR: KASIR 1' text; plus a 37-char farmer name stays <= 32 via fit(); (f) thanks line: texts contains exactly 'Terima kasih atas kepercayaannya'.
  Parallelization: Wave 1 | Blocked by: - | Blocks: 3
  References (executor has NO interview context - be exhaustive): resources/js/lib/receipt-builder.ts:1-212 (justify/fit/fmtAmount/fmtKg 3-30, buildReceipt 32-212; per-load 93-137, sortiran lines 111-124, single-load 138-156, pre-box POTONGAN 158-166, NETTO BERSIH 168-171, box 184-196, NB 197-204); tests/JS/printer-service.test.ts:177-395 (align seq :283, >=3 rules :291, 32-col :294-303, size :305-319, sorting fixture #1 SORTIRAN :361-394, PETANI :349-359, NB :336-347); resources/js/types/domain.ts:44-88 (tx fields incl. cashier_name_snapshot, farmer_name_snapshot - the fields used at Success.tsx:332/:340; there is NO petani_name field and buildReceipt has NO auth user access); resources/js/services/printer-service.ts:414-448,497-499 (buildReceipt callers - read-only); resources/js/pages/Weighing/Success.tsx:326-344 (signature block: transaction.cashier_name_snapshot :332, transaction.farmer_name_snapshot :340)
  Acceptance criteria (agent-executable): `npx vitest run tests/JS/printer-service.test.ts` exit 0 (all old + new tests green); `npm run types:check` && `npm run lint` exit 0; `grep -n "TOTAL SORTIRAN" resources/js/lib/receipt-builder.ts` >= 1; `grep -n "HUTANG SEBELUMNYA" ...` >= 1; `grep -n "Terima kasih atas kepercayaannya" ...` >= 1; `grep -c "align(" resources/js/lib/receipt-builder.ts` unchanged vs pre-edit (no new align calls)
  QA scenarios (name the exact tool + invocation): happy = vitest single file + greps above, append output to evidence. failure = temporarily change the sortiran rows to the single-line `SORTIRAN 47,5 kg @ 500: 23.750` format -> the NEW realistic fixture (c) 32-col test fails (the existing 32-col test :294-303 uses the no-sorting default fixture and can't catch it) -> revert. Evidence .omo/evidence/task-2-restructure-nota-output.txt
  Commit: Y | fix(nota): sinkronkan buildReceipt dengan layout UI (sortiran, TOTAL KOTOR, HUTANG, tanda tangan, penutup)

- [x] 3. Full-suite verification + scope guard + evidence capture
  What to do / Must NOT do:
  - Run, in order, capturing each exit code + tail output to evidence: `npm run format` (prettier write - may modify the 3 files), `npm run lint`, `npm run types:check`, `npm run test:js` (full vitest suite = 4 files, not just printer-service), `npm run build`.
  - Scope guard via BASELINE diff (the working-tree diff is empty because todos 1-2 were committed - do NOT diff the working tree): BASELINE is `git rev-parse HEAD` captured at the START OF WAVE 1, BEFORE Todo 1's commit (the wave orchestrator records it in `.omo/evidence/restructure-nota-baseline.txt`; if it was not captured, use `git diff --name-only HEAD~2..HEAD`, which assumes exactly the 2 todo commits on top of the pre-work HEAD). Then run `git diff --name-only BASELINE..HEAD` - it MUST equal exactly: resources/js/pages/Weighing/Success.tsx, resources/js/lib/receipt-builder.ts, tests/JS/printer-service.test.ts. Flag anything else. (.omo/ is NOT in .gitignore - leave its files uncommitted/untracked; the BASELINE..HEAD diff only reflects commits, which is the intent.)
  - Verify guardrails held via `git show BASELINE..HEAD --format=` piped through grep: PAPER_CLASSES block unchanged (no diff inside Success.tsx:26-55), no diff in resources/js/lib/utils.ts or anywhere under app/ or routes/, no package.json diff.
  - Do NOT commit (todos 1-2 already committed); do NOT delete any test.
  Parallelization: Wave 2 | Blocked by: 1, 2 | Blocks: -
  References: (self-contained - commands only; files under test are the 3 scope files)
  Acceptance criteria (agent-executable): all 5 commands exit 0; `git diff --name-only BASELINE..HEAD` matches the exact 3-file list (BASELINE = rev-parse HEAD captured at START OF WAVE 1, before Todo 1's commit - see TODO 3 body for the fallback; recorded in evidence); `git show BASELINE..HEAD` grep shows no PAPER_CLASSES/utils/package.json/routes changes; evidence file written
  QA scenarios (name the exact tool + invocation): happy = run all commands, save exit codes + tails to .omo/evidence/task-3-restructure-nota-output.txt. failure = inject a temporary 33-char line into buildReceipt -> 32-col test fails -> revert and re-run (proves the suite catches regressions). Evidence .omo/evidence/task-3-restructure-nota-output.txt
  Commit: N

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit
  - Compare each todo's acceptance criteria against the actual diff/evidence: all 3 todos done; canonical layout table implemented identically in BOTH Success.tsx and receipt-builder.ts (labels, bold set, HUTANG visible when prev>0 OR paid>0); no scope guardrail violated per git diff.
- [x] F2. Code quality review
  - Diff review limited to the 3 scope files; formatting clean (`npm run lint`, prettier); no duplicated logic beyond the intentional label duplication; no dead code left: the UI's old POTONGAN SORTIRAN row (:248-255) + old SORTIRAN money rows (:256-265) + the pre-box POTONGAN/NETTO BERSIH rows in both paths fully removed; the per-load SORTIRAN weight line (Success.tsx:167-176, receipt-builder.ts:111-124) is KEPT (not dead code - it is the per-load detail row).
- [x] F3. Real manual QA
  - Serve the built app (`npm run build` + `php artisan serve`, or `composer run dev`), log in as cashier, open the Weighing Success page for a transaction WITH sorting + debt: verify BERAT (KG) / HARGA (RP) / HUTANG headers, kg suffixes, bold only on NETTO SAWIT/TOTAL KOTOR/SISA HUTANG/TOTAL DITERIMA, box intact, signatures/NB/thanks intact; toggle 57mm (default) and 80mm - nothing clipped (use the in-browser print preview for the @media print path); exercise the debug-mode text receipt (printer-service debug branch / `printReceipt` debug) - new sections present, every line within width. Capture screenshots/text into .omo/evidence/. Physical Bluetooth print is best-effort/user-assisted only - do not block on hardware.
- [x] F4. Scope fidelity
  - Verify no changes exist outside the 3 files (routes/**, utils.ts, app/, package.json, Form.tsx, printer-service.ts, receipt-raster.ts, use-printer.ts); no font-size/PAPER_CLASSES changes; no test deleted; no new deps; `.omo/drafts/restructure-nota-output.md` state updated to reflect plan completion.

## Commit strategy
- One conventional commit per todo (1, 2), each on its own after its acceptance criteria pass; Todo 3 is verification-only (commit: N).
- Messages (as written in the todos): `refactor(nota): seksi berlabel BERAT/HARGA/HUTANG + satuan konsisten di NotaThermal` (todo 1), `fix(nota): sinkronkan buildReceipt dengan layout UI (sortiran, TOTAL KOTOR, HUTANG, tanda tangan, penutup)` (todo 2).
- Branch: continue current branch (Fix-Security per recent work) unless the owner directs otherwise; do not merge/push - leave for the worker session's finishing flow.
- No commit in the final wave (reviewers are read-only).

## Success criteria
- Both nota render paths (UI NotaThermal + ESC/POS buildReceipt) show the SAME labeled sections BERAT (KG) / HARGA (RP) / [HUTANG] / PEMBAYARAN with identical labels, same bold set, and kg suffix on every weight value (nothing printed without a unit).
- buildReceipt no longer loses data the UI shows: sortiran money rows (HARGA SORTIRAN + TOTAL SORTIRAN), TOTAL KOTOR, whole HUTANG section, signatures, thanks line.
- HUTANG appears when previous_debt_amount > 0 OR debt_paid_amount > 0 in both paths.
- Full vitest suite + lint + types:check + build all green; the 32-column truncation test holds with a realistic sorting+debt fixture; align sequence and size() calls unchanged; PAPER_CLASSES untouched (no font-size changes).
- BASELINE-scope guard: `git diff --name-only BASELINE..HEAD` (BASELINE = rev-parse HEAD captured at START OF WAVE 1, BEFORE Todo 1's commit; fallback `git diff --name-only HEAD~2..HEAD`) = exactly the 3 scope files.
- High-accuracy review (momus + oracle) recorded in .omo/drafts/restructure-nota-output.md before handoff.
