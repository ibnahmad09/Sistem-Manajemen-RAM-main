# security-fixes — Learnings

## [2026-09-13] Plan approved & execution start
- Plan: `.omo/plans/security-fixes.md` (SHA-256 e4fea869312f3e7e03ec3934b4ec693728624b05561e562017468d38566a288f)
- Review: round 1 CHANGES_REQUESTED (M1-M3, C1-C10) → repairs → round 2 APPROVE (momus + oracle)
- Branch: `Fix-Security` (sudah ada, kerja langsung di sini)
- Wave 1 (todos 1-6) paralel: #7, #11, #8, #2, #5, #9 — semua independen
- Wave 2 (todos 7-9) serial: #6b → #4 (butuh #6b) → #6 — semua di WeighingTransactionController
- Wave 3 (todos 10-11): Pint + lint, full test suite
- Final wave F1-F4: approval gates
- Evidence: `.omo/evidence/security-fixes/task-*.txt`
- Commit strategy: 7 commit terpisah (atau squash 1) — pilih squash 1 commit `fix(security): 9 security fixes dari audit keamanan` untuk user

## [2026-09-13] Task 7 DONE — trustProxies('*') dihapus
- bootstrap/app.php: baris trustProxies(at: '*') dihapus, TODO comment ditambahkan
- Verifikasi: grep 0 matches, config trusted_proxies.proxies = not set
- Evidence: .omo/evidence/security-fixes/task-7-trustProxies.txt

## [2026-09-13] Todo #11 done — date validation di ReportsController
- `applyReportFilters()` sekarang validate `date_start`/`date_end` nullable|date di awal method — cover index, exportPdf, exportExcel sekaligus (semua panggil method itu)
- Test: `tests/Feature/Security/DateParamValidationTest.php` (4 test, 10 assertions) — PASS
- Regression: ReportsExportTest 5 test PASS
- Pint: hanya fix single_blank_line_at_eof
- LSP `actingAs` undefined = false positive Pest (muncul di semua test file existing)
- [2026-09-13] Task #8 (inactive status) SELESAI: RoleMiddleware cek status 'active', reports routes dibungkus role middleware (semua 3 role). Test 4/4 PASS. GOTCHA: route cache stale (bootstrap/cache/routes-v7.php) membuat perubahan routes/web.php tidak terlihat di test — jalankan `php artisan route:clear` setelah edit routes.

## [2026-09-13] Task 9 DONE — FarmerDebt implicit binding + dangling transaction
- FarmerDebtController: show/destroy param $farmerDebt -> $debt (match route param {debt} dari Route::resource('debts', ...))
- Sebelumnya: implicit binding skipped -> fresh empty model -> fatal Error -> 500 + DB transaction dangling (destroy)
- rollBack() di catch (line 151) sudah ada, tidak diubah
- Test baru: tests/Feature/Security/FarmerDebtBindingTest.php (3 tests: show 200 JSON, show 404, destroy 302) — PASS 3/3, 10 assertions
- Gotcha: RoleMiddleware cek status user !== 'active' -> redirect login. Test HARUS set 'status' => 'active' di User::factory() (konvensi codebase, lihat InactiveUserBlockTest)
- Evidence: .omo/evidence/security-fixes/task-9-farmer-debt-binding.txt

## [2026-09-13] Task 2 done — CashFlow IDOR
- Guard ownership ditambahkan di update/show/destroy CashFlowController (cashier_id !== user->id && role !== super_admin → 403)
- show() & destroy() dapat param `Request $request` (method injection + route model binding)
- Test baru `tests/Feature/Security/CashFlowOwnershipTest.php` — 5 test PASS (18 assertions)
- **Gotcha**: UserFactory tidak set `status` → model instance status=NULL → RoleMiddleware (fix #8) blokir semua user factory. Solusi: set `'status' => 'active'` eksplisit di test. CashFlowTest.php lama ikut gagal (pre-existing, bukan scope task 2).

## [2026-09-13] Task 5 done — Excel formula injection
- `ReportsExport::sanitizeFormula(?string): ?string` — prepend `'` untuk nilai diawali `= + - @` (PhpSpreadsheet v5.8 DefaultValueBinder: `=` → TYPE_FORMULA)
- Diterapkan di `map()` :51-52 dan `mapDebtRow()` :71-72 (farmer_name_snapshot + kasir_name)
- Test: `tests/Feature/Security/FormulaInjectionTest.php` — 3 test, `Excel::store()` + `IOFactory::load` baca isi cell asli (C2/D2). PASS 3/3
- `Excel::store($export, 'export.xlsx')` default disk = `local` (filesystems.default) → `Storage::fake('local')` + `Storage::disk('local')->path()` works
- ReportsExportTest FAIL pre-existing (TestResponseAssert:81 "all() on array") — dari perubahan paralel ReportsController/routes/bootstrap, BUKAN dari task ini (verified via stash)
- Pint: `--dirty` ikut fix file agent lain (RoleMiddleware) — hati-hati saat commit
- [2026-09-13] CRITICAL dari task #8: UserFactory tidak set 'status' -> model in-memory status=NULL (DB default 'active' tidak di-load Eloquent). Middleware status check memblokir NULL -> SEMUA test existing yang pakai actingAs(factory user) di rute ber-role GAGAL. Fix: tambah 'status' => 'active' di UserFactory::definition() (1 baris) — butuh approval orchestrator, di luar scope task #8.

## 2026-09-13 — UserFactory status fix (task-userfactory-status)
- Eloquent `create()` does NOT load DB column defaults into the in-memory model.
  Factory-created users had `status = NULL` even though migration default is 'active'.
- Fix #8 (RoleMiddleware `$user->status !== 'active'`) exposed this: existing tests
  using `User::factory()->create(['role' => ...])` without explicit status got blocked.
- Fix: added `'status' => 'active'` to UserFactory::definition() — factory must mirror DB defaults.
- Verified: `php artisan test --compact --filter='Security|ReportsExportTest'` → 30 passed, 0 failed.

## [2026-09-13] Task 6b DONE — draft pertahankan debt_paid_amount
- WeighingTransactionController: calculate() :413 & fillTransactionData() :454 — hapus conditional `$action === 'save_draft' ? 0 :` → `$validated['debt_paid_amount'] ?? 0`
- Method signature TIDAK diubah ($action param jadi unused di kedua method — todo 8/9 akan sentuh bagian lain, jangan di-refactor di sini)
- finalizeDraft() tidak diubah (sudah benar)
- Test: tests/Feature/Security/DraftDebtPreserveTest.php — 4 passed, 12 assertions (3 test, 1 dataset 0/null)
- Regression: WeighingTransactionTest 22 passed, 175 assertions
- Pint: single_blank_line_at_eof di test file
- Evidence: .omo/evidence/security-fixes/task-6b-draft-debt.txt

## Todo 8 (#4 debt > gross guard) — 2026-09-13
- Guard debt_paid_amount > gross_total_amount ditambahkan di store/update/finalize (throw InvalidArgumentException, catch existing menangani rollback + withErrors(['error'])).
- Guard di store()/update() berlaku untuk save_draft DAN finalize → draft dengan debt > gross TIDAK bisa disimpan. Ini membuat test finalize harus mensimulasikan draft legacy (update debt_paid_amount langsung di DB) karena draft bermasalah tidak bisa dibuat lewat store() lagi.
- Form.tsx: errors.error dirender sebagai banner merah (pola sama errors.loads). Perlu cast `(errors as Record<string, string | undefined>)` karena useForm mengetik errors hanya untuk key form data.
- Test: DebtExceedsGrossTest 4 test PASS (21 assertions); DraftDebtPreserveTest tetap PASS (tidak ada regresi).

## Todo 9 (#6 TOCTOU double-finalize) — 2026-09-13
- update() & finalize(): abort_unless status check dihapus dari awal method; re-fetch model dengan lockForUpdate() + status check dipindah KE DALAM transaksi (pola return + rollBack eksplisit, bukan abort — HttpException di catch jadi pesan generik)
- finalize(): $farmer/$loads/$validated dipindah ke dalam try, dibaca dari model fresh hasil re-fetch dengan with('loads')
- Guard #4 debt>gross dipertahankan di update (:194-196) dan finalize (:271-273)
- Test: DoubleFinalizeTest 3 test PASS (15 assertions); regression DebtExceedsGross|DraftDebtPreserve|WeighingTransaction 30 PASS (208 assertions)
- lockForUpdate() no-op di SQLite — test membuktikan jalur sequential (re-fetch + status check), bukan penguncian nyata
- Evidence: .omo/evidence/security-fixes/task-6-toctou.txt

## [2026-09-13] Task 10 DONE — Pint + lint + types:check
- pint --dirty --format agent: passed (sudah clean dari run subagent sebelumnya)
- npm run lint: exit 0; npm run types:check: exit 0; pint --test --dirty: exit 0
- LSP diagnostics (actingAs undefined, @/ alias di tests/JS) = false positive pre-existing, tsc --noEmit clean
- Evidence: .omo/evidence/security-fixes/task-10-pint-lint.txt
- Todo 11 (full suite) unblocked

## [2026-09-13] Task 11 DONE — full suite + Security regression check
- `php artisan test --compact` → 122 passed, 639 assertions, exit 0 (SEMUA hijau)
- `php artisan test --compact --filter=Security` → 36 passed, 145 assertions (30 dari 8 file Security + 6 dari Settings/SecurityTest.php yang nama test-nya mengandung "security")
- Evidence: .omo/evidence/security-fixes/task-11-full-test.txt
- **Fragility ditemukan (bukan kegagalan di run wajib)**: 3 file Security baru (DebtExceedsGross, DoubleFinalize, DraftDebtPreserve) memakai helper `createTestFarmer()` yang didefinisikan di WeighingTransactionTest.php:27. Saat run file tunggal → "Call to undefined function createTestFarmer()". Saat full suite / --filter → PASS karena Pest load semua file. Ini pola pre-existing (helper di dalam file test, bukan shared helper). Fix butuh edit WeighingTransactionTest.php / Pest.php → di luar scope 1-9. **REKOMENDASI untuk orchestrator**: pindahkan createTestFarmer() ke tests/Pest.php atau tests/Helpers.php (autoload) agar test file bisa dijalankan mandiri.

## Task 11 (discovered): Global test helpers
- `createTestFarmer()` dan `weighingFormData()` dipindah dari `tests/Feature/WeighingTransactionTest.php` ke `tests/Pest.php` section Functions (global helpers).
- Penyebab bug: helper didefinisikan di dalam file test → run file tunggal gagal "Call to undefined function". Pest load semua file saat full suite, jadi hanya run file tunggal yang kena.
- Fix: definisi helper di Pest.php (auto-loaded global), hapus duplikat dari file test, hapus import `Farmer` yang jadi unused.
- Verifikasi: 3 file Security tunggal PASS (11 tests), full suite 122 passed, pint clean.
