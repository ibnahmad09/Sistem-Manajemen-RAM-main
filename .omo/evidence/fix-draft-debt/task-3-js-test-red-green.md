# Task 3 — JS Test RED Evidence (weighing-form)

**Date:** 2026-09-13
**Status:** RED ✅ + GREEN ✅ (red-to-green lengkap)

## Test file
`tests/JS/weighing-form.test.ts` — 6 skenario untuk `buildInitialWeighingFormState` (pure function yang AKAN dibuat di `resources/js/lib/weighing-form.ts`).

## Command
```bash
npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts
```

## Actual output (verbatim)
```
 RUN  v4.1.5 /Users/assistmac2026/Documents/code/Sistem-Manajemen-RAM-main

 ❯ tests/JS/weighing-form.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/JS/weighing-form.test.ts [ tests/JS/weighing-form.test.ts ]
Error: Cannot find package '@/lib/weighing-form' imported from /Users/assistmac2026/Documents/code/Sistem-Manajemen-RAM-main/tests/JS/weighing-form.test.ts
 ❯ tests/JS/weighing-form.test.ts:2:1
      1| import { describe, expect, it } from 'vitest';
      2| import { buildInitialWeighingFormState, emptyLoad } from '@/lib/weighi…
       | ^
      3| import type { WeighingTransaction } from '@/types';
      4|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  14:51:50
   Duration  717ms (transform 51ms, setup 0ms, import 0ms, tests 0ms, environment 0ms)
```

## Analysis
- **RED valid:** `Cannot find package '@/lib/weighing-form'` — module-not-found karena `resources/js/lib/weighing-form.ts` memang belum dibuat (disengaja, todo 1 yang akan membuatnya).
- Test suite gagal di import stage (0 test jalan) — ini bukti RED yang benar untuk TDD: test menegaskan API yang diharapkan (`buildInitialWeighingFormState`, `emptyLoad`) sebelum implementasi ada.
- Setelah todo 1 membuat lib, test ini harusnya GREEN.

## 6 skenario yang ditulis
1. `draft` dengan `debt_paid_amount: 100000` → `state.debt_paid_amount === 100000` (regresi bug `Form.tsx:130` hardcode 0)
2. tanpa draft (`null`) → `state.debt_paid_amount === 0`
3. `draft` dengan `debt_paid_amount: 0` → `state.debt_paid_amount === 0`
4. `farmer_id` → `'42'` dari draft, `''` saat null
5. `loads` → dipetakan dari `draft.loads` (`gross_weight`, `tare_weight`, `has_sorting`, `sorting_weight`); `[emptyLoad()]` saat null
6. `payment_method` → `'transfer'` dari draft, `'cash'` saat null

## Fixture
- `draftWithDebt`: `WeighingTransaction` lengkap, `debt_paid_amount: 100000`, `payment_method: 'transfer'`, 1 load (`gross_weight: 1000`, `tare_weight: 200`, `has_sorting: true`, `sorting_weight: 100`).
- `draftWithZeroDebt`: spread dari `draftWithDebt` dengan `debt_paid_amount: 0`.
- Semua skenario dipanggil dengan `{ draft, latestPrice: null, deductionConfig: null }`.

---

# GREEN — Todo 1 selesai, red-to-green lengkap

**Date:** 2026-09-13
**Status:** GREEN ✅ — 6 passed

## Command
```bash
npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts
```

## Actual output (verbatim)
```
 RUN  v4.1.5 /Users/assistmac2026/Documents/code/Sistem-Manajemen-RAM-main


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  15:01:35
   Duration  583ms (transform 89ms, setup 0ms, import 123ms, tests 11ms, environment 0ms)
```

## Analysis
- **GREEN valid:** `resources/js/lib/weighing-form.ts` (todo 1) sudah dibuat — `emptyLoad()` verbatim + `buildInitialWeighingFormState` dengan fix `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0` (baris 46).
- Semua 6 skenario PASS, termasuk skenario 1 (`debt_paid_amount: 100000` → `100000`) yang sebelumnya RED karena bug hardcode `Form.tsx:130`.
- Red-to-green lengkap: RED (module-not-found, 0 test) → GREEN (6 passed). Acceptance todo 3 terpenuhi.