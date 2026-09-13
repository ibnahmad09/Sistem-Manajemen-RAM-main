# Learnings — fix-draft-debt

## Task 3 — JS test RED (weighing-form)

- **RED dibuktikan** sebelum lib ada: `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` → `Cannot find package '@/lib/weighing-form'` (module-not-found, 0 test jalan). Evidence: `.omo/evidence/fix-draft-debt/task-3-js-test-red-green.md`.
- Test file: `tests/JS/weighing-form.test.ts` — 6 skenario untuk `buildInitialWeighingFormState` + `emptyLoad` (keduanya akan diekspor dari `resources/js/lib/weighing-form.ts`).
- **API yang diharapkan dari lib** (dari test):
  - `buildInitialWeighingFormState({ draft, latestPrice, deductionConfig })` → object state useForm.
  - `emptyLoad()` → `{ gross_weight: 0, tare_weight: 0, has_sorting: false, sorting_weight: 0 }`.
  - `debt_paid_amount` harus `Number(draft.debt_paid_amount)` saat draft ada (bukan hardcode 0) — ini fix bug `Form.tsx:130`.
  - `farmer_id` → `String(draft.farmer_id)` / `''`.
  - `loads` → map dari `draft.loads` (`gross_weight`, `tare_weight`, `has_sorting`, `sorting_weight` via `Number()`) / `[emptyLoad()]`.
  - `payment_method` → `draft.payment_method` / `'cash'`.
- **Fixture type-correct**: `WeighingTransaction` butuh ~40 field wajib; `WeighingLoad` ~15 field. Gunakan full object literal. `@/types` re-export dari `resources/js/types/index.ts` (auth, navigation, ui, domain).
- **LSP noise**: `Cannot find module '@/lib/...'` dan `@/types` di file test adalah pre-existing (muncul juga di `utils.test.ts`, `printer-service.test.ts`) — alias `@` hanya di-resolve oleh vitest config, bukan LSP. Bukan regresi dari perubahan ini.
- **Pola test existing**: `tests/JS/utils.test.ts` — `import { describe, expect, it } from 'vitest'`, alias `@` → `resources/js` (vitest.config.ts `include: ['tests/JS/**/*.test.ts']`).
- **Todo berikutnya (todo 1)**: buat `resources/js/lib/weighing-form.ts` mengekspor `buildInitialWeighingFormState` + `emptyLoad`, lalu refactor `Form.tsx` untuk memakainya. Test ini harus jadi GREEN.

## Task 4 — Backend assert (weighing.create draft prop)
- `WeighingTransactionController::create()` renders `Weighing/Form` with `'draft' => $draft` (model via `activeDraft()` scope, `findOrFail`).
- Cast `debt_paid_amount => 'decimal:2'` → Inertia serializes as string `'100000.00'`; assert with `->where('draft.debt_paid_amount', '100000.00')`.
- Pattern: `assertInertia(fn (Assert $page) => $page->component('Weighing/Form')->where(...))` — needs `use Inertia\Testing\AssertableInertia as Assert;`.
- `weighing.create` route accepts `?draft=` query param (resource route); draft must be `status=draft` + `is_latest_version=true` (activeDraft scope) or `findOrFail` 404s.
- Test count in DraftDebtPreserveTest: 4 → 5 (3 fungsi + 1 dataset 2 kasus + 1 baru). All pass.

## [2026-09-13 14:58] Task: todo-1-lib
- **GREEN tercapai**: `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` → **6 passed** (512ms). Red-to-green lengkap (RED module-not-found dibuktikan di task 3).
- **File dibuat**: `resources/js/lib/weighing-form.ts` — `emptyLoad()` verbatim dari `Form.tsx:85-92`, `buildInitialWeighingFormState()` verbatim dari object literal `useForm` `Form.tsx:106-134` dengan SATU perubahan: `debt_paid_amount: 0` → `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0`.
- **Tipe diverifikasi**: `LoadInput` ada di `lib/utils.ts:117` (bukan di types/domain.ts — plan sudah benar). `DeductionConfig` (domain.ts:136), `PalmPrice` (domain.ts:14), `WeighingTransaction` (domain.ts:44) semua dari `@/types`. `WeighingTransaction.debt_paid_amount: number` (domain.ts:70).
- **`Number()` wajib**: cast `debt_paid_amount => 'decimal:2'` → Inertia kirim string `'100000.00'`; `Number('100000.00')` = 100000. Test `expect(state.debt_paid_amount).toBe(100000)` pass → konfirmasi.
- **Tipe return**: object biasa (bukan `useForm` instance) — test memanggil sebagai pure function, tidak butuh Inertia. `payment_method` cast `as 'cash' | 'transfer'` dipertahankan verbatim.
- **`git diff` kosong untuk file baru** (untracked) — evidence pakai isi file sebagai diff. `git status --short` → `?? resources/js/lib/weighing-form.ts`.
- **LSP tidak terinstall** (typescript server declined) — verifikasi via vitest + konfirmasi tipe manual dari source. LSP noise `Cannot find module '@/lib/weighing-form'` di test file adalah pre-existing (alias `@` hanya vitest).
- **Todo 2 (refactor Form.tsx)**: tinggal ganti object literal `useForm` (L106-134) dengan `buildInitialWeighingFormState({ draft, latestPrice, deductionConfig })` + hapus `emptyLoad` lokal (L85-92) → import dari lib. `emptyLoad` dipakai juga di `addLoad` (L207) — pastikan import mencakup keduanya.

## [2026-09-13 15:03] Task: todo-2-form
- **Refactor selesai**: `Form.tsx` kini pakai `buildInitialWeighingFormState({ draft, latestPrice, deductionConfig })` + `emptyLoad` dari `@/lib/weighing-form`. Diff: +1 import, -8 baris `emptyLoad` lokal, -29 baris literal `useForm` → +3 baris call. Verifikasi: types:check exit 0, lint exit 0, vitest 6 passed (1.04s). Evidence: `.omo/evidence/fix-draft-debt/task-2-form.md`.
- **Urutan edit penting**: tambah import lib DULU → LSP langsung error `Import declaration conflicts with local declaration of 'emptyLoad'` (karena fungsi lokal masih ada). Hapus fungsi lokal setelahnya → error hilang. Urutan aman: import → hapus lokal → ganti useForm.
- **`LoadInput` type import (L22) tetap dibutuhkan** — dipakai `updateLoad` sebagai `Partial<LoadInput>`. Jangan dihapus saat refactor.
- **`emptyLoad` setelah refactor hanya 2×**: import (L23) + `addLoad` (L173). Tidak ada `emptyLoad is not defined`.
- **`npm run lint` = `eslint . --fix`** — bisa mengubah file lain; cek `git status --short` setelahnya. Di todo ini hanya `Form.tsx` yang berubah (modifikasi `DraftDebtPreserveTest.php` adalah todo 4 sebelumnya).
- **LSP noise di file lain pre-existing** (printer-service.test.ts, utils.test.ts, weighing-form.test.ts, WeighingTransactionTest.php, routes/web.php) — alias `@` hanya di-resolve vitest, PHP `actingAs` noise LSP. Bukan regresi.
- **Todo berikutnya (todo 5)**: jalankan `npm run format` untuk prettier pass penuh (tabWidth 4, singleQuote true) — file sudah rapi manual, tinggal konfirmasi.

## [2026-09-13 15:01] Task: todo-3-green

- **GREEN dibuktikan mandiri**: `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` → `Test Files 1 passed (1)`, `Tests 6 passed (6)` (Duration 583ms).
- Red-to-green lengkap: RED (module-not-found `@/lib/weighing-form`, 0 test) → GREEN (6 passed) setelah todo 1 membuat `resources/js/lib/weighing-form.ts`.
- Lib `buildInitialWeighingFormState` baris 46: `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0` — fix bug hardcode `Form.tsx:130` terbukti benar oleh skenario 1 (100000 → 100000).
- Evidence todo 3 di-append section GREEN (output verbatim), header diubah ke `RED ✅ + GREEN ✅ (red-to-green lengkap)`; konten RED tidak dihapus.
- Acceptance todo 3 terpenuhi: "Setelah todo 1 → GREEN (semua test PASS)".

## [2026-09-13 15:07] Task: todo-5-full-verify
- **Semua 5 command hijau, exit 0 berurutan** (format → test:js → lint → types:check → composer test). Evidence: `.omo/evidence/fix-draft-debt/task-5-full-verify.txt`.
- `npm run format` (Prettier): exit 0 — `weighing-form.ts` & `Form.tsx` di-rewrite Prettier (tanpa suffix "(unchanged)"), sisanya unchanged. Tidak ada error.
- `npm run test:js` (Vitest): exit 0 — **86/86 passed** (4 files, 1.76s), termasuk `weighing-form.test.ts` (6 skenario).
- `npm run lint` (ESLint): exit 0 — tanpa output (clean).
- `npm run types:check` (TSC): exit 0 — tanpa output (clean).
- `composer test`: exit 0 — Pint gate `passed`, Pest **123 tests / 123 passed / 649 assertions** (8.6s). Total ≥ 122 ✓ (naik dari baseline karena +1 test DraftDebtPreserveTest).
- **`composer test` output JSON**: `{"tool":"pint","result":"passed"}{"tool":"pest","result":"passed","tests":123,"passed":123,"assertions":649,"duration_ms":8619}` — format ringkas, bukan tabel Pest biasa (Laravel 13 + Pest 4 JSON reporter).
- **git status setelah format/lint**: hanya 4 file fix yang berubah (`Form.tsx`, `DraftDebtPreserveTest.php`, `weighing-form.ts` baru, `weighing-form.test.ts` baru) + `.omo/` — tidak ada perubahan tak terduga dari prettier/eslint --fix.
- **LSP noise pre-existing terkonfirmasi** (bukan regresi): `@/` alias di test JS (printer-service.test.ts, utils.test.ts, weighing-form.test.ts) + `actingAs`/`user` di PHP (WeighingTransactionTest.php, routes/web.php) — sudah didokumentasikan di task 3.
- **Acceptance todo 5 terpenuhi**: semua 4 command exit 0, tidak ada test dihapus/di-skip. Todo 5 selesai — siap Final Verification Wave (F1-F4).
