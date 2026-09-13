# Evidence — Task 2: Refactor Form.tsx ke lib weighing-form

**Plan**: `.omo/plans/fix-draft-debt.md` — todo 2
**Tanggal**: 2026-09-13 15:03
**Status**: ✅ SELESAI — semua verifikasi exit 0

## Ringkasan Perubahan

`resources/js/pages/Weighing/Form.tsx` diubah untuk memakai lib `resources/js/lib/weighing-form.ts` (dibuat di todo 1):

1. **(a)** Tambah import `import { buildInitialWeighingFormState, emptyLoad } from '@/lib/weighing-form';` (baris 23, tepat setelah `import type { LoadInput } from '@/lib/utils';`)
2. **(b)** Hapus definisi lokal `function emptyLoad(): LoadInput { ... }` (8 baris)
3. **(c)** Ganti object literal `useForm({ ... })` (29 baris) → `useForm(buildInitialWeighingFormState({ draft, latestPrice, deductionConfig }))`
4. **(d)** Semua pemakaian lain (`data.*`, `setData`, `form.transform`, `addLoad` yang memakai `emptyLoad()` di baris 173) dibiarkan apa adanya — `emptyLoad` kini di-resolve dari import lib.

**Fix bug**: `debt_paid_amount: 0` hardcode (Form.tsx:130 lama) kini `draft ? Number(draft.debt_paid_amount) : 0` via lib.

## Verifikasi

### 1. `npm run types:check` → exit 0

```
> types:check
> tsc --noEmit

EXIT_CODE=0
```

### 2. `npm run lint` → exit 0

```
> lint
> eslint . --fix

EXIT_CODE=0
```

### 3. `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` → 6 passed

```
 RUN  v4.1.5 /Users/assistmac2026/Documents/code/Sistem-Manajemen-RAM-main


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  15:03:03
   Duration  1.04s (transform 76ms, setup 0ms, import 211ms, tests 13ms, environment 5ms)

EXIT_CODE=0
```

## Diff `resources/js/pages/Weighing/Form.tsx`

```diff
diff --git a/resources/js/pages/Weighing/Form.tsx b/resources/js/pages/Weighing/Form.tsx
index 4650be6..5144db1 100644
--- a/resources/js/pages/Weighing/Form.tsx
+++ b/resources/js/pages/Weighing/Form.tsx
@@ -20,6 +20,7 @@ import {
     sanitizeCurrencyInput,
 } from '@/lib/utils';
 import type { LoadInput } from '@/lib/utils';
+import { buildInitialWeighingFormState, emptyLoad } from '@/lib/weighing-form';
 import * as farmersRoute from '@/routes/farmers';
 import * as weighingRoute from '@/routes/weighing';
 import type {
@@ -82,15 +83,6 @@ function NumberInput({
     );
 }
 
-function emptyLoad(): LoadInput {
-    return {
-        gross_weight: 0,
-        tare_weight: 0,
-        has_sorting: false,
-        sorting_weight: 0,
-    };
-}
-
 export default function WeighingForm({
     farmers,
     latestPrice,
@@ -103,35 +95,9 @@ export default function WeighingForm({
     const [loadingDebt, setLoadingDebt] = useState(false);
     const actionRef = useRef<'save_draft' | 'finalize'>('finalize');
 
-    const form = useForm({
-        farmer_id: draft ? String(draft.farmer_id) : '',
-        transaction_date: draft
-            ? draft.transaction_date.slice(0, 10)
-            : new Date().toISOString().split('T')[0],
-        loads: draft?.loads?.length
-            ? draft.loads.map((l) => ({
-                  gross_weight: Number(l.gross_weight),
-                  tare_weight: Number(l.tare_weight),
-                  has_sorting: l.has_sorting,
-                  sorting_weight: Number(l.sorting_weight),
-              }))
-            : [emptyLoad()],
-        has_deduction: draft ? draft.has_deduction : true,
-        deduction_percentage: draft
-            ? Number(draft.deduction_percentage)
-            : (deductionConfig?.percentage ?? 5),
-        palm_price_per_kg: draft
-            ? Number(draft.palm_price_per_kg)
-            : (latestPrice?.price_per_kg ?? 0),
-        sorting_price_per_kg: draft ? Number(draft.sorting_price_per_kg) : 0,
-        sorting_deduction_percentage: draft
-            ? Number(draft.sorting_deduction_percentage)
-            : 5,
-        debt_paid_amount: 0,
-        payment_method: (draft ? draft.payment_method : 'cash') as
-            | 'cash'
-            | 'transfer',
-    });
+    const form = useForm(
+        buildInitialWeighingFormState({ draft, latestPrice, deductionConfig }),
+    );
 
     useEffect(() => {
         form.transform((formData) => ({
```

## Catatan

- `import type { LoadInput } from '@/lib/utils'` (baris 22) **dipertahankan** — masih dipakai `updateLoad` (L165) sebagai `Partial<LoadInput>`.
- `emptyLoad` kini hanya muncul 2×: import (L23) dan `addLoad` (L173) — tidak ada `emptyLoad is not defined`.
- `git status --short` setelah perubahan: `M resources/js/pages/Weighing/Form.tsx` (satu-satunya file yang disentuh todo ini; `DraftDebtPreserveTest.php` adalah modifikasi todo 4 sebelumnya).
- LSP typescript tidak terinstall (user declined) — verifikasi via types:check + lint + vitest.