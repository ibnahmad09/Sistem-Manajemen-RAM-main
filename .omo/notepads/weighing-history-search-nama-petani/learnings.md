# Learnings — weighing history search by farmer name

## [2026-09-15] Task: todo-1-index

- `index()` di `WeighingTransactionController` sekarang filter pakai `farmer_name` (LIKE via `whereHas('farmer')`), bukan `farmer_id`.
- Pakai `$request->filled('farmer_name')` — string kosong tidak memfilter (beda dengan `has()` yang true untuk string kosong).
- `$farmers` + prop `'farmers'` dihapus dari `index()` (leftover percobaan select dropdown). Import `Farmer` tetap dibutuhkan — `create()` masih pakai `Farmer::where('status','active')`.
- `'filters'` sekarang `$request->only(['farmer_name', 'date_start', 'date_end'])`.
- Verifikasi: pint passed, `WeighingTransactionTest` 26/26 passed (198 assertions).
- Todo 2 (List.tsx) harus update: ganti select farmer_id → input search farmer_name, dan baca `filters.farmer_name`.

## Todo 1: Route edit weighing (SELESAI)
- `routes/web.php`: `Route::resource('weighing', ...)->except(['edit', 'destroy'])` → `->except(['destroy'])`.
- `php artisan route:clear` dijalankan (route cache stale dari plan security-fixes).
- `php artisan route:list --path=weighing` → `GET|HEAD weighing/{weighing}/edit weighing.edit` terdaftar (9 routes).
- Wayfinder regenerated via `npx vite build` (29.97s). `resources/js/routes/weighing/index.ts` sekarang punya `export const edit` (line 411) + `edit.url`, `edit.get`, `edit.form`.
- Catatan: wayfinder routes berbentuk direktori `resources/js/routes/weighing/index.ts`, bukan file `weighing.ts`.
- Todo 8 (List.tsx actions) bisa import `edit` dari `@/routes/weighing`.

## Todo 3: edit() method (SELESAI)

- `edit()` ditambahkan di `WeighingTransactionController` setelah `create()`, sebelum `store()`.
- Guard: `abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 404)` — hanya nota final terbaru yang bisa direvisi.
- Eager load: `$weighing->load(['farmer', 'loads'])`.
- Data form: `Farmer::where('status','active')`, `PalmPrice::getLatestPrice()`, `DeductionConfig::getActiveConfig()` — sama persis dengan `create()`.
- Render: `Inertia::render('Weighing/Form', ['transaction' => $weighing, ...])` — prop `transaction` (bukan `draft`).
- Verifikasi: pint passed, `WeighingTransactionTest` 26/26 passed (198 assertions).
- Todo 7 (Form.tsx) akan pakai prop `transaction` untuk load data existing ke form revisi.

## Todo 2: List.tsx filter farmer_id → farmer_name (SELESAI)

- Props: hapus `farmers: Pick<Farmer, 'id' | 'name'>[]`; `filters` → `{ farmer_name?: string; date_start?: string; date_end?: string }`.
- Import `Farmer` dari `@/types` TETAP dipertahankan — masih dipakai di `transactions: PaginatedData<WeighingTransaction & { farmer: Farmer }>`.
- State: `farmerId` → `farmerName` (init dari `filters.farmer_name ?? ''`).
- `applyFilter()`: `if (farmerName) params.farmer_name = farmerName;` — pakai `Record<string, string>` params.
- `clearFilter()`: `setFarmerName('')`; tombol Reset tampil jika `filters.date_start || filters.date_end || filters.farmer_name`.
- UI: blok `<select>` petani diganti `<input type="text">` placeholder "Cari nama petani..." + `onKeyDown` Enter → `applyFilter()`. Style sama dengan input date (`h-9 rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary`).
- `data-test` attributes (draft-card, draft-resume, draft-cancel) tidak disentuh.
- Catatan: working tree sudah punya uncommitted changes (select block + farmerId) sebelum edit — diff vs HEAD menunjukkan net-add; final state diverifikasi benar.
- Verifikasi: `npm run types:check` exit 0, `npm run lint` exit 0, `npm run format` dijalankan (prettier reformat List.tsx, re-verify types+lint tetap 0).

## Todo 5: Branch revisi di update() + helper extraction (SELESAI)

- `createFinancialEntries(WeighingTransaction $transaction, Farmer $farmer, $user, array $validated): void` — diekstrak VERBATIM dari `finalizeDraft()` (FarmerDebt::create + CashierCashEntry::create + `$farmer->syncBalance()`). Satu-satunya penyesuaian: `$notaNumber` → `$transaction->nota_number` (nilai identik — transaction sudah di-update dengan nota_number SEBELUM method ini dipanggil; signature tidak boleh tambah param).
- `reverseTransactionFinancials(WeighingTransaction $transaction, $user): void` — entry negatif: CashierCashEntry `amount = -final_paid_amount_rounded` (type farmer_payment, category bayar_petani) + FarmerDebt `amount = -debt_paid_amount` jika > 0 (type payment). **Pakai snapshot dari transaksi** (`cashier_id`, `cashier_name_snapshot`, `farmer_id`, `farmer_name_snapshot`, `payment_method`, `transaction_date`) — BUKAN `$user->id`/`$user->name`. `created_by` tetap `$user->id` (siapa yang merevisi). Tutup dengan `Farmer::find($transaction->farmer_id)->syncBalance()`.
- `finalizeDraft()` di-refactor: blok financial (ex-baris 577-603) → `$this->createFinancialEntries($transaction, $farmer, $user, $validated);`. Generate nota + update status tetap di finalizeDraft.
- `update()` branch revisi (status !== 'draft'): guard `abort_unless(is_latest_version && in_array(status, ['printed','revised']), 422)` → validate `revision_reason` → `$action = 'finalize'` → hitung currentDebt + calculation + guard debt_paid ≤ gross_total → archive old (`is_latest_version=false, status='revised', cashier_balance_deducted=false`) → buat row baru via `fillTransactionData` + set status/printed_at/is_latest_version/cashier_balance_deducted/revision_of/revision_number(+1)/revision_reason → `storeLoads` → `reverseTransactionFinancials($weighing, $user)` **SEBELUM** generate nota (old sudah 'revised' = non-draft, sequence konsisten) → generate nota (count non-draft, exclude `$txn->id`) → `createFinancialEntries($txn, ...)` → commit → redirect `weighing.success` dengan nota baru.
- Draft branch di update() TIDAK berubah — kode existing verbatim (fillTransactionData, save, delete+storeLoads, finalizeDraft).
- Catatan: `$weighing->revision_number` untuk printed = 0 (applyFinalizedLifecycle), untuk revised = nomor revisi sebelumnya → `+1` increment benar.
- `$transaction->debt_paid_amount` / `final_paid_amount_rounded` adalah decimal:2 cast (string) — negasi `-` bekerja pada numeric string PHP.
- Verifikasi: pint passed, `WeighingTransactionTest` 26/26 passed (198 assertions).
- Todo 6 (cancel void) akan memanggil `reverseTransactionFinancials()` — method sudah public-accessible di controller yang sama.

## Todo 7: Form.tsx mode revisi (SELESAI)

- Props: tambah `transaction?: WeighingTransaction | null` di interface Props (baris ~45).
- Destructure: `transaction = null` — diprioritaskan di form init: `buildInitialWeighingFormState({ draft: transaction ?? draft, ... })` (shape transaction SAMA dengan draft — farmer_id, transaction_date, loads, harga, dll).
- `weighing-form.ts`: `revision_reason` BELUM ada di initial state → tambah `revision_reason: ''` (string, bukan null — type domain pakai `string | null` tapi form state pakai string kosong).
- `submit()`: `if (transaction) put(update(transaction.id))` → `else if (draft) put(update(draft.id))` → `else post(store())`.
- `isRevising = !!transaction` — dipakai untuk judul, banner, textarea alasan, tombol submit, hide draft button.
- Judul: `Revisi Nota #${transaction?.nota_number}` saat isRevising.
- Banner revisi: warna UNGU (purple-200/50, dark:purple-900/40/10) — beda dari draft (biru) dan conflict (amber). Text: "Merevisi nota #X milik Y. Perubahan akan membuat nota BARU dan mengarsipkan nota lama."
- Textarea "Alasan Revisi" wajib (`required`) + error display `errors.revision_reason`.
- Tombol finalize: `isRevising ? 'Revisi & Cetak Nota Baru' : 'SELESAI & CETAK'`; tombol SIMPAN DRAFT di-hide saat isRevising (`{!isRevising && (...)}`).
- fetchDebt effect: `if (draft || transaction)` → `fetchDebt(String((transaction ?? draft)?.farmer_id))` — currentDebt terisi untuk revisi juga.
- `data-test` attributes (weighing-farmer, weighing-finalize, weighing-save-draft) TIDAK diubah.
- Verifikasi: `npm run types:check` exit 0, `npm run lint` exit 0, prettier --write dijalankan (reformat ternary indent), re-verify tetap 0.

## [2026-09-15] Task: todo-6-cancel-void

- `cancel()` di `WeighingTransactionController` sekarang menerima `Request $request` (baru) + `WeighingTransaction $weighing` — route binding tetap bekerja (Laravel injects Request + route model).
- Branch draft: VERBATIM kode lama (update status cancelled + is_latest_version false, return 'Draft dibatalkan.').
- Branch final (printed/revised + is_latest_version): guard `abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 422, 'Hanya transaksi final terbaru yang bisa dibatalkan.')` → `DB::beginTransaction()` → `reverseTransactionFinancials($weighing, $user)` → update status cancelled + is_latest_version false + cashier_balance_deducted false → `$weighing->farmer->syncBalance()` → commit. Catch `\Exception` → rollBack + `back()->withErrors(['error' => 'Gagal membatalkan transaksi: '.$e->getMessage()])`.
- Double syncBalance (di `reverseTransactionFinancials` via `Farmer::find(...)` dan setelah update status via `$weighing->farmer`) idempotent — tidak masalah.
- Tidak ada row yang dihapus; tidak ada route yang diubah (`weighing.cancel` sudah ada).
- Verifikasi: pint passed, `WeighingTransactionTest` 26/26 passed (198 assertions).
- Todo 8 (List.tsx tombol Hapus) dan Todo 9 (feature test) bisa lanjut — method cancel sudah siap dipanggil dari frontend.

## [2026-09-15] Task: todo-9-tests

- File baru `tests/Feature/WeighingRevisionVoidTest.php` — 7 test Pest, RefreshDatabase via Pest.php (tanpa trait manual), pola setup `weighingFormData()`/`createTestFarmer()` + assertion `WeighingTransactionTest`/`CashFlowTest`.
- Test: (1) edit page render prop `transaction.nota_number`; (2) revisi final → nota baru (0002) + arsip lama (revised, is_latest=false, cashier_balance_deducted=false) + reversal cash/debt + balance benar; (3) revisi tanpa revision_reason → ditolak; (4) revisi non-latest → ditolak; (5) void final → cancelled + reversal + balance terkoreksi + index tidak memuat row; (6) void draft → perilaku lama tanpa reversal; (7) void non-latest → 422.
- **⚠ Status code guard (penting)**: `update()` punya `abort_unless(..., 422)` dan `$request->validate()` DI DALAM `try { } catch (\Exception $e)`. `HttpException` (dari abort) dan `ValidationException` keduanya extends `\Exception` → TERTANGKAP → response jadi 302 + `withErrors(['error' => ...])`, BUKAN 422. Jadi test 3 & 4 pakai `assertSessionHasErrors('error')`, bukan `assertStatus(422)`. Sebaliknya `cancel()` punya `abort_unless` DI LUAR try → test 7 void non-latest benar-benar 422. (Diverifikasi via probe test: no-reason=302, revisi non-latest=302, void non-latest=422.)
- **⚠ BUG controller (dilaporkan, TIDAK diperbaiki — di luar scope todo 9)**: revisi dengan `debt_paid_amount` SAMA antara store & revisi menghasilkan `farmer.balance` (field tersimpan) STALE. Penyebab: `createFinancialEntries` memanggil `$farmer->syncBalance()` pada instance `$farmer` controller yang in-memory balance-nya masih nilai lama (400000) → `syncBalance()` set balance ke nilai yang sama → Eloquent dirty-check → `save()` no-op → DB tetap 500000 (hasil syncBalance `reverseTransactionFinancials` via `Farmer::find(...)` instance fresh). `calculateDebtBalance()` (computed) benar = 400000. Workaround di test 2: pakai `debt_paid_amount` BERBEDA (store 100000, revisi 200000) → balance tersimpan benar (300000 = net hanya debt_paid baru). Fix yang disarankan: di `createFinancialEntries` pakai instance fresh (`Farmer::find($transaction->farmer_id)->syncBalance()`) atau `$farmer->refresh()` sebelum syncBalance.
- Verifikasi: `php artisan test --compact --filter=WeighingRevisionVoidTest` → 7/7 PASS (69 assertions); regression `WeighingTransactionTest` + `CashFlowTest` → 31/31 PASS; pint passed.

## [2026-09-15] Task: todo-8-list-actions

- Kolom Aksi tbody di `resources/js/pages/Weighing/List.tsx` (baris ~379) sekarang berisi 3 elemen dalam `<div className="flex items-center justify-center gap-2">`: Link Edit (`data-test="tx-edit"`, `href={weighingRoute.edit(tx.id)}`), button Hapus (`data-test="tx-void"`, `confirm()` + `router.post(weighingRoute.cancel(tx.id).url)`), dan Link Nota (existing, tidak diubah).
- `weighingRoute` sudah di-import sebagai `* as weighingRoute from '@/routes/weighing'` — `edit` dan `cancel` tersedia tanpa tambah import. `router` sudah di-import dari `@inertiajs/react` (dipakai cancel draft) — tidak ada import duplikat.
- `weighingRoute.edit(tx.id)` menerima plain number (signature `args: { weighing: string | number } | ... | string | number`) — sama pola dengan draft-resume yang pass RouteDefinition object langsung ke `href`.
- `confirm()` native browser — pola identik dengan draft-cancel existing.
- `tx.nota_number` dan `tx.farmer_name_snapshot` dipakai di pesan confirm — keduanya sudah ada di tipe `WeighingTransaction`.
- Tidak ada icon (teks saja), tidak ada dependency baru, tidak ada perubahan file lain, pola draft (draft-card/draft-resume/draft-cancel) tidak disentuh.
- Verifikasi: `npm run types:check` exit 0, `npm run lint` exit 0.
- Todo 10 (e2e test edit & void) bisa lanjut — `data-test="tx-edit"` dan `data-test="tx-void"` sudah tersedia per baris.

## [2026-09-15] Task: todo-10-js-e2e

- **JS test** (`tests/JS/weighing-form.test.ts`): tambah `it('defaults revision_reason to empty string')` — assert `revision_reason` is `''` for both with-draft and without-draft. Prettier-format: `--write` memperbaiki missing newline at EOF. 99/99 tests pass.
- **E2E edit test** (`tests/e2e/weighing.spec.ts` — 'J2: revisi nota final menghasilkan nota baru'):
  - Setup: buat transaksi baru via UI (Siti Aminah, bruto 1000, tara 100, finalize → success page → capture oldNota).
  - Revision flow: goto /weighing → assert row visible → `tx-edit.click()` → `waitForURL(/\/weighing\/\d+\/edit/)` → assert heading "Revisi Nota #..." via `getByRole('heading', { name: ... })` → change bruto-0 to 1100 → fill textarea via `getByPlaceholder('Jelaskan alasan revisi...')` → finalize → new nota on success page.
  - Assertions: newNota !== oldNota, toast "Revisi transaksi berhasil disimpan.", new row visible with "Selesai", old row count 0 (archived, is_latest_version=false → excluded from index).
- **E2E void test** (`tests/e2e/weighing.spec.ts` — 'J2: void nota final menghapus baris dari daftar'):
  - Setup: buat transaksi baru (Bambang Sutrisno, bruto 900, tara 90, finalize).
  - Void flow: goto /weighing → assert row visible → `page.once('dialog', d => d.accept())` → `tx-void.click()` → toast "Transaksi dibatalkan. Saldo kasir & petani dikoreksi otomatis." → `page.reload()` → assert row count 0.
- **⚠ Build stale (penting)**: Setelah Todo 2 (hapus prop `farmers` dari controller `index()`) dan Todo 8 (ubah List.tsx aksi), `npm run build` BELUM dijalankan. Built asset `List-Da4eAYnJ.js` masih punya kode lama yang `farmers.map(...)` → `Cannot read properties of undefined (reading 'map')` → blank page di /weighing. Fix: jalankan `npm run build` sebelum E2E. Ini BUKAN source code change — hanya regenerate build artifacts.
- **⚠ DB isolation**: E2E suite expects a fresh seeded DB. Jalankan `php artisan --env=e2e migrate:fresh --seed --seeder=E2eSeeder --force` sebelum suite, atau test yang create draft (Ahmad Yani) akan gagal karena draft dari run sebelumnya masih ada (store() guard line 136: `activeDraft()->where('farmer_id', ...)->exists()` → returns back() with error).
- **Farmer allocation**: test edit pakai Siti Aminah, test void pakai Bambang Sutrisno — farmers lain sudah dialokasikan ke specs existing (Budi=J2 happy path, Rina=validation, Ahmad=J2 draft conflict, Hendra=Dewi/Nurul=J3 draft). 8 farmers total, semua terpakai.
- Verifikasi: `npm run test:js` 99/99 PASS; E2E main 27/27 PASS (3 setup + 25 existing + 2 new); E2E empty 6/6 PASS.

## [2026-09-15] Task: fix-syncbalance-bug

- Bug: `createFinancialEntries()` diakhiri `$farmer->syncBalance()` dengan instance `$farmer` STALE di branch revisi `update()` (di-load sebelum `reverseTransactionFinancials()`). `syncBalance()` set `balance` dari DB (benar) tapi `save()` jadi NO-OP karena Eloquent dirty-check (nilai in-memory == nilai original instance) → DB balance tersimpan = nilai dari syncBalance reversal (salah).
- Fix (1 baris, WeighingTransactionController.php:683): `$farmer->syncBalance()` → `Farmer::find($transaction->farmer_id)->syncBalance()` — fresh instance, pola sama dengan `reverseTransactionFinancials` baris 696. Aman untuk kedua pemanggil (`finalizeDraft` store flow + branch revisi).
- Test regression: `revisi dengan debt_paid_amount sama tetap menyimpan balance benar` di WeighingRevisionVoidTest.php — revisi dengan debt_paid_amount SAMA (100000) → balance = 400000.00 (loan 500000 - payment baru 100000; reversal + payment baru saling meniadakan).
- Verifikasi: `php artisan test --compact --filter=WeighingRevisionVoidTest` → 8/8 passed (71 assertions); `vendor/bin/pint --dirty --format agent` passed.
