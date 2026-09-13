# fix-draft-debt - Work Plan

## TL;DR (For humans)

**What you'll get**: Membuka kembali draft timbangan yang disimpan dengan "Bayar Hutang" > 0 akan MENAMPILKAN nilai hutang itu (tidak lagi tampil 0), dan menyimpan ulang draft tidak akan menimpa nilainya jadi 0. Root cause adalah bug frontend murni: `Form.tsx` meng-hardcode `debt_paid_amount: 0` pada inisialisasi form dan tidak pernah membaca nilai dari prop `draft` (semua field lain membaca dari draft; field hutang satu-satunya yang tidak).

**Why this approach**: Fix sebelumnya (#6b) sudah benar di sisi backend (store/update/fillTransactionData menyimpan `debt_paid_amount` apa adanya — terbukti dari `DraftDebtPreserveTest` yang PASS). Yang rusak adalah inisialisasi state form di frontend, jadi perbaikannya di frontend: ekstrak initialisasi form ke pure function agar bisa di-unit-test dengan Vitest yang sudah ada (tanpa menambah dependency baru), lalu test red-to-green yang benar-benar menangkap bug.

**What it will NOT do**: Tidak mengubah logika backend perhitungan/penyimpanan (sudah benar); tidak mengubah perilaku form baru (tanpa draft) — field hutang tetap 0; tidak menambah dependency baru (tanpa @testing-library/jsdom); tidak menyentuh guard #4 (debt > gross), TOCTOU #6, maupun fix lain.

**Effort**: Kecil — 1 file lib baru (pure function), 1 edit kecil Form.tsx, 1 file test Vitest baru, 1 tambahan assertion test backend. Estimasi 1 wave, 5 todos.

**Risk**: Rendah. Risiko utama adalah regresi render Form (salah refactor object literal) — dimitigasi dengan memindahkan field verbatim + full suite + lint + types:check + test JS baru.

**Decisions**: (1) Pakai Vitest existing, tanpa dependency baru — guardrail AGENTS.md "do not change dependencies without approval"; (2) ekstraksi ke `resources/js/lib/weighing-form.ts` mengikuti pola `lib/utils.ts` yang sudah ter-test; (3) `Number(draft.debt_paid_amount)` untuk konversi aman dari string/number Inertia prop (type `WeighingTransaction.debt_paid_amount: number` sudah ada di types/domain.ts:70).

## Scope

**In scope**:
- `resources/js/lib/weighing-form.ts` (BARU) — pure function `buildInitialWeighingFormState()` + export `emptyLoad()`; fix inti `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0`; semua field lain dipindahkan VERBATIM dari object literal `useForm` di Form.tsx saat ini (baris 106-134).
- `resources/js/pages/Weighing/Form.tsx` — import dari lib baru, ganti `useForm({...})` → `useForm(buildInitialWeighingFormState({ draft, latestPrice, deductionConfig }))`; import `emptyLoad` dari lib baru (dipakai juga oleh `addLoad`, baris 207).
- `tests/JS/weighing-form.test.ts` (BARU) — unit test Vitest red-to-green pada `buildInitialWeighingFormState`.
- `tests/Feature/Security/DraftDebtPreserveTest.php` — tambah 1 test `assertInertia`: GET `weighing.create?draft=X` mengirim `draft.debt_paid_amount` utuh ke frontend.

**Out of scope / Must NOT**:
- TIDAK mengubah `WeighingTransactionController.php` (store/update/finalize/calculate/fillTransactionData) — backend sudah benar; #6b/#4/#6 tidak disentuh.
- TIDAK menambah dependency baru (`npm install` apa pun dilarang — termasuk @testing-library/react, jsdom, happy-dom).
- TIDAK mengubah perilaku form baru tanpa draft (`debt_paid_amount` tetap 0).
- TIDAK mengubah field form lain (loads, harga, potongan, payment_method) — dipindahkan verbatim, bukan diubah.
- TIDAK menghapus/men-disable test yang sudah ada.

## Verification strategy

- **Agent-executed QA per todo**: setiap todo punya command konkret + evidence path di `.omo/evidence/fix-draft-debt/`.
- **Red-to-green**: tulis test JS dulu (task 3) → jalankan sebelum fix → RED (module-not-found karena lib belum ada, ATAU `debt_paid_amount` 0 jika lib dibuat dengan perilaku lama) → terapkan fix → GREEN. Prosedur eksplisit di todo 3: (a) tulis test, (b) jalankan → RED, (c) tulis lib + edit Form, (d) jalankan → GREEN. **JANGAN pakai `git stash` untuk membuktikan RED** (lib baru adalah untracked file — plain `git stash` tidak akan men-stash-nya; cukup urutan tulis-test-dulu). Evidence RED dan GREEN keduanya dicatat.
- **Full suite**: `composer test` harus hijau (regression: 122+ test existing tidak boleh ada yang patah).
- **Frontend gates**: `npm run test:js`, `npm run lint`, `npm run types:check` semua exit 0.

## Execution strategy

- **Satu wave** (5 todos, dependensi linier 1→2→4 bebas, 3 red-to-green terkait 1).
- Dependency matrix: 1 (lib) tidak depends; 2 (Form.tsx) depends 1; 3 (test JS) depends 1 (RED dulu, GREEN setelah 1); 4 (test backend) tidak depends; 5 (verifikasi) depends 1-4.
- Worker: eksekusi via `$start-work fix-draft-debt`; semua QA dijalankan agent (bukan manual user).
- Commit: SATU squash commit (lihat Commit strategy).

## Todos

- [x] 1. Buat `resources/js/lib/weighing-form.ts` dengan `buildInitialWeighingFormState()` + `emptyLoad()` — fix inti `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0`
  What to do / Must NOT do: Buat file baru `resources/js/lib/weighing-form.ts`. Export:
  - `emptyLoad(): LoadInput` — salin VERBATIM dari Form.tsx baris 85-92 (gross_weight: 0, tare_weight: 0, has_sorting: false, sorting_weight: 0).
  - `buildInitialWeighingFormState({ draft, latestPrice, deductionConfig }: { draft: WeighingTransaction | null | undefined; latestPrice: PalmPrice | null; deductionConfig: DeductionConfig | null })` — salin object literal useForm Form.tsx baris 106-134 VERBATIM, KECUALI baris `debt_paid_amount: 0` diganti `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0`. JANGAN ubah field lain, JANGAN ubah tipe return (object biasa), JANGAN tambah dependency.
  Imports di file lib: `import type { LoadInput } from '@/lib/utils';` dan `import type { DeductionConfig, PalmPrice, WeighingTransaction } from '@/types';`.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2, 3
  References: Form.tsx baris 85-92 (`emptyLoad`), baris 106-134 (object literal useForm), types/domain.ts:70 (`debt_paid_amount: number`), lib/utils.ts (pola file lib ter-test)
  Acceptance: File ada; `debt_paid_amount` dibaca dari `draft` (Number) saat draft ada, 0 saat null; semua field lain identik dengan object literal lama (diff hanya baris debt_paid_amount); tidak ada dependency baru di package.json.
  QA scenarios: (happy) `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` → PASS setelah fix (lihat todo 3 untuk RED dulu); (failure) jalankan test yang sama terhadap state sebelum fix → RED (module-not-found ATAU `debt_paid_amount` bernilai 0 — tergantung apakah lib sudah dibuat). Evidence `.omo/evidence/fix-draft-debt/task-1-lib.md` (catat diff `git diff resources/js/lib/weighing-form.ts`).
  Commit: N (masuk squash commit final)

- [x] 2. Update `resources/js/pages/Weighing/Form.tsx` — pakai `buildInitialWeighingFormState()` + `emptyLoad()` dari lib baru
  What to do / Must NOT do: (a) Tambah import `import { buildInitialWeighingFormState, emptyLoad } from '@/lib/weighing-form';`. (b) Hapus definisi lokal `emptyLoad()` (baris 85-92). (c) Ganti `const form = useForm({ ... })` (baris 106-134) menjadi `const form = useForm(buildInitialWeighingFormState({ draft, latestPrice, deductionConfig }));`. (d) Biarkan semua pemakaian `data.*`, `setData`, `form.transform` apa adanya. MUST NOT: ubah JSX lain, ubah tipe Props, ubah perilaku submit, tambah dependency.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 5
  References: Form.tsx baris 1-32 (import block), 85-92, 106-134; lib/weighing-form.ts (todo 1); WAYFINDER/Inertia skill tidak diperlukan (tidak ada route baru)
  Acceptance: `npm run types:check` exit 0; `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` PASS; tidak ada import yang tidak terpakai (lint).
  QA scenarios: (happy) `npm run types:check` + `npm run lint` → keduanya 0; (failure) hapus satu field dari lib → types:check atau test JS GAGAL (bukti binding Form↔lib). Evidence `.omo/evidence/fix-draft-debt/task-2-form.md`.
  Commit: N

- [x] 3. Buat `tests/JS/weighing-form.test.ts` — unit test red-to-green untuk `buildInitialWeighingFormState`
  What to do / Must NOT do: Buat file baru `tests/JS/weighing-form.test.ts` (pola: tests/JS/utils.test.ts — `import { describe, expect, it } from 'vitest'`). Test WAJIB:
  - `draft dengan debt_paid_amount 100000 → state.debt_paid_amount === 100000` (ini yang RED saat bug masih ada);
  - `tanpa draft → state.debt_paid_amount === 0`;
  - `draft dengan debt_paid_amount 0 → state.debt_paid_amount === 0`;
  - `farmer_id` String dari draft saat ada, '' saat null;
  - `loads` dipetakan dari `draft.loads` (per load: gross_weight, tare_weight, has_sorting, sorting_weight) saat ada, `[emptyLoad()]` saat tidak;
  - `payment_method` dari draft saat ada, 'cash' saat null.
  Buat minimal 1 fixture draft lengkap (WeighingTransaction) dengan debt_paid_amount 100000 dan 1 load; 1 panggilan tanpa draft (null); 1 dengan debt 0.
  MUST NOT: menambah dependency; import dari '@inertiajs/react' (hanya pure function); menulis test yang tidak menegaskan nilai debt.
  Catatan tambahan: panggil `buildInitialWeighingFormState({ draft, latestPrice: null, deductionConfig: null })` untuk semua skenario (latestPrice/deductionConfig tidak di-assert di test ini).
  Parallelization: Wave 1 | Blocked by: 1 (untuk GREEN; RED bisa dibuktikan sebelum) | Blocks: 5
  References: tests/JS/utils.test.ts (pola), vitest.config.ts (include `tests/JS/**/*.test.ts`, alias `@` → resources/js), types/domain.ts (WeighingTransaction, WeighingLoad, PalmPrice, DeductionConfig)
  Acceptance: Jalankan terhadap state sebelum fix (lib belum ada / Form masih hardcode) → RED (expect 100000, received 0 atau module-not-found). Setelah todo 1 → GREEN (semua test PASS).
  QA scenarios: (happy) `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` → `6 passed`; (failure) buktikan RED dulu: jalankan dengan lib lama (tanpa fix) → minimal 1 gagal. Evidence `.omo/evidence/fix-draft-debt/task-3-js-test-red-green.md` (tempel output RED dan GREEN).
  Commit: N

- [x] 4. Tambah test `assertInertia` di `tests/Feature/Security/DraftDebtPreserveTest.php` — GET `weighing.create?draft=` mengirim `draft.debt_paid_amount` utuh
  What to do / Must NOT do: Tambah 1 test baru (Pest `test(...)`): buat cashier + farmer (pola test existing di file ini: `createTestFarmer()`, `weighingFormData()` dari tests/Pest.php), POST `weighing.store` dengan `debt_paid_amount => 100000` + `action => save_draft`, lalu `$this->actingAs($cashier)->get(route('weighing.create', ['draft' => $draft->id]))->assertInertia(fn (Assert $page) => $page->component('Weighing/Form')->where('draft.debt_paid_amount', '100000.00'));`. Pastikan `use Inertia\Testing\AssertableInertia as Assert;` di top file. MUST NOT: mengubah test existing di file itu; mengubah controller; menghapus test.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 5
  References: DraftDebtPreserveTest.php (pola & helper), tests/Feature/ReportsExportTest.php:76 (pola assertInertia), tests/Feature/WeighingTransactionTest.php:261 (pola assertInertia komponen Weighing/Form)
  Acceptance: `php artisan test --compact --filter=DraftDebtPreserveTest` → semua PASS (4 existing + 1 baru = 5 tests).
  QA scenarios: (happy) filter test → `5 passed`; (failure) ubah `where` jadi value salah → test GAGAL (bukti assertion benar-benar menegaskan nilai). Setelah edit file ini, jalankan `vendor/bin/pint --dirty --format agent` (composer test menjalankan gate `@lint:check` yang akan gagal jika PHP tidak terformat — jangan menunggu sampai todo 5). Evidence `.omo/evidence/fix-draft-debt/task-4-backend-assert.md`.
  Commit: N

- [x] 5. Verifikasi penuh + evidence: `npm run test:js`, `npm run lint`, `npm run types:check`, `composer test`
  What to do / Must NOT do: Jalankan berurutan: (a) `npm run format` (Prettier — file TS baru harus conform) lalu `npm run test:js` → semua PASS (termasuk weighing-form.test.ts baru); (b) `npm run lint` → 0 error; (c) `npm run types:check` → 0; (d) `composer test` → 122+ test (existing + baru) semua hijau, exit 0. MUST NOT: memperbaiki kegagalan dengan menghapus test; melewati lint/types; commit sebelum semua hijau.
  Parallelization: Wave 1 | Blocked by: 1,2,3,4 | Blocks: —
  References: AGENTS.md "Perintah Utama" & "Formatting & Linting"; composer.json scripts; package.json scripts
  Acceptance: Semua 4 command exit 0; tidak ada test yang dihapus/di-skip.
  QA scenarios: (happy) semua command exit 0 + `composer test` menampilkan total pass ≥ 122; (failure) jika ada yang gagal — fix code (bukan hapus test) dan ulangi. Evidence `.omo/evidence/fix-draft-debt/task-5-full-verify.txt` (gabungkan output 4 command, tempel exit code).
  Commit: N

## Final verification wave

> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — Setiap file di-diff dengan plan: `resources/js/lib/weighing-form.ts` baru (fix `debt_paid_amount` dari draft), `Form.tsx` hanya import + ganti useForm + hapus emptyLoad lokal, `tests/JS/weighing-form.test.ts` baru (6 skenario), `DraftDebtPreserveTest.php` +1 test assertInertia. TIDAK ada perubahan di controller/backend logic, TIDAK ada dependency baru di package.json.
- [x] F2. Code quality review — Vitest syntax benar, Pest syntax benar, tidak ada hardcoded selain fixture test, `Number(draft.debt_paid_amount)` digunakan (bukan `parseFloat` string), tidak ada TODO/debug tersisa, lint clean.
- [x] F3. Real execution QA — Jalankan `npx vitest run --config vitest.config.ts tests/JS/weighing-form.test.ts` → hijau; `php artisan test --compact --filter=DraftDebtPreserveTest` → 5 passed; `composer test` full → hijau; buktikan dengan output aktual (bukan klaim).
- [x] F4. Scope fidelity — Review semua file berubah: hanya 4 file (1 baru lib, 1 edit Form.tsx, 1 baru test JS, 1 edit test PHP). TIDAK ada perubahan lain (controller, routes, package.json, config). Semua 5 todos hadir & acceptance terpenuhi.

## Commit strategy

- **Commit 1 (squash)**: `fix(perhitungan): draft pertahankan hutang saat dibuka kembali (init form dari draft)` — 4 file: `resources/js/lib/weighing-form.ts` (baru), `resources/js/pages/Weighing/Form.tsx`, `tests/JS/weighing-form.test.ts` (baru), `tests/Feature/Security/DraftDebtPreserveTest.php`.
- Catatan: commit ini MELENGKAPI commit sebelumnya `edcb93a fix(security): 9 security fixes dari audit keamanan` (yang sudah berisi fix backend #6b). Tidak perlu amend commit lama — commit terpisah lebih jelas rivayatnya.

## Success criteria

1. Membuka draft dengan `debt_paid_amount = 100.000` → field "Bayar Hutang Hari Ini" menampilkan 100.000 (bukan 0).
2. Menyimpan ulang draft tersebut (tanpa mengubah hutang) → `debt_paid_amount` di DB tetap '100000.00' (tidak ditimpa 0).
3. Form baru tanpa draft → field hutang tetap 0 (perilaku lama tidak berubah).
4. Test JS baru menangkap regresi: jika `debt_paid_amount` init di-hardcode 0 lagi, test RED.
5. `composer test` full suite hijau (tidak ada regresi 122+ test).
6. Tidak ada dependency baru; lint & types:check clean.