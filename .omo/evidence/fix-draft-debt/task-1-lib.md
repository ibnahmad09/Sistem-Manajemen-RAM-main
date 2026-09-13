# Task 1 — Lib `weighing-form.ts` Evidence

**Date:** 2026-09-13
**Status:** GREEN ✅ (6 passed — red-to-green complete)

## File dibuat
`resources/js/lib/weighing-form.ts` — pure function `buildInitialWeighingFormState()` + `emptyLoad()`.

## Command
```bash
npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts
```

## Actual output (verbatim)
```
 RUN  v4.1.5 /Users/assistmac2026/Documents/code/Sistem-Manajemen-RAM-main


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  14:58:41
   Duration  512ms (transform 73ms, setup 0ms, import 107ms, tests 13ms, environment 0ms)
```

## Diff (file baru — `git diff` kosong karena untracked, diff = isi file)
```bash
$ git status --short resources/js/lib/weighing-form.ts
?? resources/js/lib/weighing-form.ts
```

```ts
import type { LoadInput } from '@/lib/utils';
import type { DeductionConfig, PalmPrice, WeighingTransaction } from '@/types';

export function emptyLoad(): LoadInput {
    return {
        gross_weight: 0,
        tare_weight: 0,
        has_sorting: false,
        sorting_weight: 0,
    };
}

export function buildInitialWeighingFormState({
    draft,
    latestPrice,
    deductionConfig,
}: {
    draft: WeighingTransaction | null | undefined;
    latestPrice: PalmPrice | null;
    deductionConfig: DeductionConfig | null;
}) {
    return {
        farmer_id: draft ? String(draft.farmer_id) : '',
        transaction_date: draft
            ? draft.transaction_date.slice(0, 10)
            : new Date().toISOString().split('T')[0],
        loads: draft?.loads?.length
            ? draft.loads.map((l) => ({
                  gross_weight: Number(l.gross_weight),
                  tare_weight: Number(l.tare_weight),
                  has_sorting: l.has_sorting,
                  sorting_weight: Number(l.sorting_weight),
              }))
            : [emptyLoad()],
        has_deduction: draft ? draft.has_deduction : true,
        deduction_percentage: draft
            ? Number(draft.deduction_percentage)
            : (deductionConfig?.percentage ?? 5),
        palm_price_per_kg: draft
            ? Number(draft.palm_price_per_kg)
            : (latestPrice?.price_per_kg ?? 0),
        sorting_price_per_kg: draft ? Number(draft.sorting_price_per_kg) : 0,
        sorting_deduction_percentage: draft
            ? Number(draft.sorting_deduction_percentage)
            : 5,
        debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0,
        payment_method: (draft ? draft.payment_method : 'cash') as
            | 'cash'
            | 'transfer',
    };
}
```

## Verifikasi terhadap plan
- ✅ `emptyLoad(): LoadInput` — verbatim dari `Form.tsx:85-92` (gross_weight: 0, tare_weight: 0, has_sorting: false, sorting_weight: 0)
- ✅ `buildInitialWeighingFormState({ draft, latestPrice, deductionConfig })` — object literal `useForm` dari `Form.tsx:106-134` verbatim, HANYA baris `debt_paid_amount: 0` → `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0`
- ✅ Tipe return object biasa (bukan `useForm` instance) — sesuai test yang memanggil sebagai pure function
- ✅ Imports: `LoadInput` dari `@/lib/utils` (dikonfirmasi ada di `lib/utils.ts:117`), `DeductionConfig`, `PalmPrice`, `WeighingTransaction` dari `@/types` (dikonfirmasi di `types/domain.ts:136,14,44`)
- ✅ `Number(draft.debt_paid_amount)` — cast `decimal:2` mengirim string `'100000.00'`, tipe `WeighingTransaction.debt_paid_amount: number` (domain.ts:70)
- ✅ Tidak ada field lain yang diubah, tidak ada dependency baru, `Form.tsx` tidak disentuh (todo 2)

## Catatan
- `git diff` kosong karena file baru (untracked) — diff = isi file (ditampilkan di atas).
- LSP `typescript` tidak terinstall (user menolak sebelumnya) — verifikasi via vitest (6 passed) + tipe dikonfirmasi manual dari source.
- LSP noise `Cannot find module '@/lib/weighing-form'` di `tests/JS/weighing-form.test.ts` adalah pre-existing (alias `@` hanya di-resolve vitest, bukan LSP) — sudah tercatat di notepad task 3.