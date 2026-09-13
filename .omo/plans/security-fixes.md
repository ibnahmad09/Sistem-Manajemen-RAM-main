# security-fixes - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** 9 security fixes pada backend PHP yang memperbaiki celah keuangan (hutang petani salah hitung, CashFlow bisa diedit sesama kasir, formula injection di laporan Excel), keamanan akses (user inactive tetap bisa login), dan ketahanan sistem (TOCTOU, date param). Tiap fix dilengkapi Pest test yang membuktikan fix bekerja.

**Why this approach:** Fix dilakukan secara minimal (tidak refactor arsitektur), per-temuan diperbaiki di titik sumber masalah yang tepat, dengan regression test untuk menangkap regresi. Tidak ada dependency baru.

**What it will NOT do:** Tidak mengubah registrasi publik (user memutuskan biarkan), tidak mengubah cascade delete petani (user memutuskan biarkan), tidak mengubah arsitektur, tidak menambah dependency, tidak mengubah DB schema.

**Effort:** Medium (1-2 hari kerja)
**Risk:** Medium - sentuh alur finalisasi timbangan (#6b, #6) yang merupakan jalur inti transaksi

**Decisions to sanity-check:** #4: hutang bayar > timbangan diblokir dengan error (bukan dipotong otomatis). #7: trustProxies nonaktifkan (dev lokal, perlu diatur ulang saat deploy).

Your next move: approve this plan, then run `/start-work` to execute. Full execution detail follows below.

---

> TL;DR (machine): 9 security fixes dalam 2 execution waves + 1 final verification wave. Medium effort, medium risk. Patches pada 7 file backend (6 PHP + routes/web.php) + 1 file UI (Weighing/Form.tsx — hanya render error message) + 8 Pest test files baru.

## Scope
### Must have
- #6b Draft mempertahankan `debt_paid_amount` (stop zeroing saat save_draft)
- #4 Blokir `debt_paid_amount > gross_total_amount` dengan pesan error 422
- #9 Fix FarmerDebt implicit binding (param name mismatch) + dangling transaction rollback
- #7 Hapus `trustProxies('*')` dari bootstrap/app.php (dev lokal, perlu diatur ulang saat deploy)
- #8 Enforce `users.status = active` di RoleMiddleware — berlaku untuk SEMUA rute authenticated, termasuk rute reports (web.php:110-112) yang dibungkus role middleware agar status check aktif di sana
- #6 TOCTOU double-finalize (pindahkan cek status ke dalam transaksi)
- #2 CashFlow IDOR (scope ownership di update/destroy/show — show() juga IDOR read)
- #5 Excel formula injection sanitasi
- #11 Export date param validasi

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Tidak mengubah registrasi publik / features::registration()
- Tidak mengubah cascade delete pada farmer
- Tidak mengubah status "draft IDOR" (by design)
- Tidak menambah dependency Composer/npm
- Tidak mengubah database schema (migrasi)
- Tidak refactor arsitektur atau nama class/method
- Tidak mengubah UI frontend (React/TypeScript) kecuali diperlukan untuk error message
- Tidak mengubah route names atau URL patterns

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: **tests-after** + Pest v4
- Existing test suite: `php artisan test --compact` — semua harus tetap hijau
- Test files baru: `tests/Feature/Security/` (dibuat oleh artisan make:test --pest)
- Evidence path: `.omo/evidence/security-fixes/` (QA output disimpan di setiap todo)

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

- **Wave 1** (todos 1-6): Semua fix yang tidak saling terkait — #7, #11, #8, #2, #5, #9 — bisa dikerjakan paralel tanpa dependency. Masing-masing todo = 1 fix + test file sendiri.
- **Wave 2** (todos 7-9): #6b (hentikan zeroing), #4 (validasi debt ≤ gross — butuh #6b), #6 (TOCTOU) — ketiganya menyentuh file yang sama (WeighingTransactionController), dikerjakan berurutan dalam satu todo stream.
- **Wave 3** (todos 10-11): Pint + lint, lalu full test suite.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1. #7 trustProxies | — | — | 2,3,4,5,6,7,8,9 |
| 2. #11 date validasi | — | — | 1,3,4,5,6,7,8,9 |
| 3. #8 inactive status | — | — | 1,2,4,5,6,7,8,9 |
| 4. #2 cashflow IDOR | — | — | 1,2,3,5,6,7,8,9 |
| 5. #5 formula injection | — | — | 1,2,3,4,6,7,8,9 |
| 6. #9 farmer-debt binding | — | — | 1,2,3,4,5,7,8,9 |
| 7. #6b draft preserve debt | — | 8 | 1,2,3,4,5,6,9 |
| 8. #4 debt ≤ gross validasi | 7 | — | 1,2,3,4,5,6,9 |
| 9. #6 TOCTOU | — | — | 1,2,3,4,5,6,7,8 |
| 10. Pint + Lint | 1-9 | 11 | — |
| 11. Full test suite | 10 | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. #7 Hapus trustProxies('*') — nonaktifkan proxy trust
  What to do / Must NOT do: Hapus baris `$middleware->trustProxies(at: '*');` dari `bootstrap/app.php:18`. Tambah komentar `// TODO: Set trusted proxies saat deploy (Laravel Cloud / nginx reverse proxy)` sebagai pengingat. Jangan hapus method `trustProxies()` — hanya hapus pemanggilan dengan `'*'`.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References (executor has NO interview context - be exhaustive): `bootstrap/app.php:17-18`, `app/Providers/FortifyServiceProvider.php:85-89` (login throttle keyed by IP)
  Acceptance criteria (agent-executed): `grep -n "trustProxies" bootstrap/app.php` return 0 matches (atau hanya komentar TODO)
  QA scenarios (name the exact tool + invocation): happy: `php artisan tinker --execute 'echo config("trusted_proxies.proxies") ?? "not set";'` — tidak boleh return `*`; failure: tidak ada test spesifik (config change). Evidence `.omo/evidence/security-fixes/task-7-trustProxies.txt`
  Commit: Y | fix(security): hapus trustProxies('*') — dev lokal tidak perlu proxy trust; perlu diatur ulang saat deploy

- [x] 2. #11 Validasi date param di ReportsController
  What to do / Must NOT do: Tambah validasi `date` untuk `date_start` dan `date_end` di `ReportsController.php` — paling baik di awal method `applyReportFilters()` atau buat FormRequest baru. Minimal: `$request->validate(['date_start' => 'nullable|date', 'date_end' => 'nullable|date'])`. Jangan mengubah method signature. Jangan mengubah filename PDF/Excel export.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `app/Http/Controllers/ReportsController.php:20-31` (applyReportFilters), `app/Http/Controllers/ReportsController.php:97-112` (index), `app/Http/Controllers/ReportsController.php:114-131` (exportPdf), `app/Http/Controllers/ReportsController.php:133-145` (exportExcel), existing FormRequest patterns di `app/Http/Requests/`
  Acceptance criteria: Pest test mengirim request dengan `date_start=garbage` → redirect 302 kembali dengan session error `date_start` (bukan 500). Format tanggal valid → request sukses 200/302.
  QA scenarios: Pest test `tests/Feature/Security/DateParamValidationTest.php`: (1) GET `/reports?date_start=garbage` → 302 + `assertSessionHasErrors('date_start')`; (2) GET `/reports?date_start=2026-01-01&date_end=2026-12-31` → 200; (3) GET `/reports/export/excel?date_start=garbage` → 302 + `assertSessionHasErrors('date_start')`; (4) GET `/reports/export/pdf?date_start=garbage` → 302 + `assertSessionHasErrors('date_start')`. Catatan: `$request->validate()` pada request normal menghasilkan redirect 302 dengan session errors (bukan 422 — 422 hanya untuk JSON/API). Evidence `.omo/evidence/security-fixes/task-11-date-validation.txt`
  Commit: Y | fix(security): validasi date param di ReportsController — cegah 500 error dari input invalid

- [x] 3. #8 Enforce users.status 'active' di RoleMiddleware — mencakup SEMUA rute authenticated
  What to do / Must NOT do: Modifikasi `app/Http/Middleware/RoleMiddleware.php` — refactor pemanggilan `$request->user()` ke variabel lokal `$user`, lalu tambahkan cek status SETELAH cek auth dan SEBELUM role check, sehingga body `handle()` menjadi:
  ```php
  public function handle(Request $request, Closure $next, string ...$roles): Response
  {
      $user = $request->user();

      if (! $user) {
          return redirect()->route('login');
      }

      if ($user->status !== 'active') {
          auth()->logout();

          return redirect()->route('login')->withErrors(['email' => 'Akun Anda tidak aktif. Silakan hubungi admin.']);
      }

      if (! in_array($user->role, $roles)) {
          abort(403, 'Unauthorized action.');
      }

      return $next($request);
  }
  ```
  PENTING: JANGAN panggil `$request->session()->invalidate()` atau `->regenerate()` setelah `auth()->logout()` — flash errors harus survive agar `errors.email` tampil di halaman login (`resources/js/pages/auth/login.tsx:43` merender `InputError message={errors.email}`). Jangan mengubah signature `handle()`. Jangan menambah middleware baru.
  Lalu di `routes/web.php:109-112`: bungkus 3 rute reports dalam group role middleware — TANPA mengubah nama route ataupun URL:
  ```php
  // Reports - Accessible by all roles (role middleware agar status 'active' di-enforce di sini juga)
  Route::middleware(['role:super_admin,cashier,owner'])->group(function () {
      Route::get('reports', [ReportsController::class, 'index'])->name('reports.index');
      Route::get('reports/export/pdf', [ReportsController::class, 'exportPdf'])->name('reports.export.pdf');
      Route::get('reports/export/excel', [ReportsController::class, 'exportExcel'])->name('reports.export.excel');
  });
  ```
  Alasan: rute reports sebelumnya TIDAK lewat RoleMiddleware (hanya `auth`+`verified`, web.php:15) — tanpa ini user inactive tetap bisa membaca laporan keuangan. Role list = semua 3 role (komentar asli baris 109 "Accessible by all roles") sehingga perilaku akses role TIDAK berubah; yang berubah hanya status check kini aktif di sana.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `app/Http/Middleware/RoleMiddleware.php:9-27`, `app/Models/User.php:14` (status di-fillable), `database/migrations/2026_05_07_150154_add_role_to_users_table.php:16` (enum active/inactive, default active), `routes/web.php:109-112` (rute reports tanpa role middleware), `resources/js/pages/auth/login.tsx:43` (InputError untuk errors.email)
  Acceptance: User status 'inactive' → redirect ke login dengan `errors.email` untuk SEMUA rute authenticated — termasuk `/weighing` (ber-role) dan `/reports` (sebelumnya tanpa role middleware). User 'active' → perilaku normal (semua role tetap bisa akses reports).
  QA scenarios: Pest test `tests/Feature/Security/InactiveUserBlockTest.php`: (1) Login user 'active' → GET `/weighing` → 200 (sukses); (2) Set user status ke 'inactive' → login → GET `/weighing` → redirect 302 ke `route('login')` + `assertSessionHasErrors('email')`; (3) User 'inactive' → GET `/reports` → redirect 302 ke login (membuktikan coverage rute reports); (4) User 'inactive' → GET `/reports/export/excel` → redirect 302 ke login. CATATAN: jangan test `/dashboard` sebagai target blok — route `dashboard` (web.php:18-27) TIDAK ber-role middleware; closure-nya redirect ke role dashboard (ber-role) sehingga blok terjadi di hop kedua; test ke rute ber-role lebih presisi. Evidence `.omo/evidence/security-fixes/task-8-inactive-status.txt`
  Commit: Y | fix(security): enforce users.status inactive — user nonaktif diblokir di semua rute authenticated termasuk reports

- [x] 4. #2 CashFlow IDOR: scope ownership di update/destroy/show
  What to do / Must NOT do: Tambahkan ownership guard di `CashFlowController.php` pada method `update` (:115), `show` (:141), dan `destroy` (:151). `show()` dan `destroy()` SAAT INI TIDAK punya parameter `$request` — tambahkan `Request $request` sebagai parameter pertama (Laravel method injection bekerja bersama route model binding; konsisten dengan `update()` yang sudah punya `$request`):
  ```php
  public function show(Request $request, CashierCashEntry $cashFlow)
  public function destroy(Request $request, CashierCashEntry $cashFlow)
  ```
  Guard yang SAMA di awal ketiga method (setelah opening `{`, sebelum logic lain):
  ```php
  abort_if(
      $cashFlow->cashier_id !== $request->user()->id && $request->user()->role !== 'super_admin',
      403,
      'Anda tidak memiliki akses ke entri kas ini.'
  );
  ```
  (super_admin dikecualikan — full access; role lain yang bisa mencapai route cash-flow hanyalah cashier, jadi guard menutup IDOR antar cashier). Tanpa guard, `show()` (:141-146) adalah IDOR read yang mengembalikan JSON entri kas milik cashier lain. **Jangan** mengubah index scope atau store scope. Jangan mengubah model CashierCashEntry.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `app/Http/Controllers/CashFlowController.php:115` (update — sudah punya $request), `app/Http/Controllers/CashFlowController.php:141-146` (show — IDOR read, return JSON, TANPA $request), `app/Http/Controllers/CashFlowController.php:151-161` (destroy — TANPA $request; `use Illuminate\Http\Request` sudah ada di file), `app/Http/Controllers/CashFlowController.php:22-24` (index — pola scope yang sudah benar)
  Acceptance: Cashier A update/hapus/lihat CashFlow milik Cashier B → 403. Super_admin bisa update/hapus/lihat CashFlow milik siapa saja. Cashier A akses entry sendiri → sukses.
  QA scenarios: Pest test `tests/Feature/Security/CashFlowOwnershipTest.php`: (1) Login cashier A, entry milik cashier B dibuat → PUT `/cash-flow/{entryB}` → 403; (2) DELETE `/cash-flow/{entryB}` → 403; (3) GET `/cash-flow/{entryB}` (show) → 403; (4) Login cashier A → update entry milik sendiri → 302 sukses; (5) Login super_admin → update/delete entry milik cashier A → sukses. Evidence `.omo/evidence/security-fixes/task-2-cashflow-idor.txt`
  Commit: Y | fix(security): scope CashFlow update/destroy/show ke pemilik — cegah IDOR antar cashier

- [x] 5. #5 Excel formula injection sanitasi
  What to do / Must NOT do: Tambah helper method di `app/Exports/ReportsExport.php`:
  ```php
  private function sanitizeFormula(?string $value): ?string
  {
      if ($value === null || $value === '') {
          return $value;
      }

      if (in_array($value[0], ['=', '+', '-', '@'], true)) {
          return "'".$value;
      }

      return $value;
  }
  ```
  Signature `?string $value): ?string` WAJIB (C6): `map()` (:51-52) dan `mapDebtRow()` (:71-72) meneruskan `$tx['farmer_name_snapshot'] ?? null` dan `$tx['kasir_name'] ?? null` yang BISA null — tipe `string` ketat akan melempar TypeError. Panggil helper untuk `farmer_name_snapshot` dan `kasir_name` di kedua method: ganti `$tx['farmer_name_snapshot'] ?? null` → `$this->sanitizeFormula($tx['farmer_name_snapshot'] ?? null)` (map :51, mapDebtRow :71) dan `$tx['kasir_name'] ?? null` → `$this->sanitizeFormula($tx['kasir_name'] ?? null)` (map :52, mapDebtRow :72). **Jangan** mengubah heading, date formatting, cell styling, kolom numerik, atau nota_number (internal, tidak user-controlled).
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `app/Exports/ReportsExport.php:42-61` (map — farmer :51, kasir :52), `app/Exports/ReportsExport.php:63-81` (mapDebtRow — farmer :71, kasir :72), `resources/views/reports/pdf.blade.php` (PDF export — tidak berubah, formula injection hanya relevan di Excel)
  Acceptance: Farmer bernama `=CMD('calc.exe')` → di Excel cell tampil teks `'=CMD('calc.exe')`, bukan formula.
  QA scenarios: Pest test `tests/Feature/Security/FormulaInjectionTest.php` — ASSERT ISI CELL dengan `Excel::store()` + PhpSpreadsheet `IOFactory::load` (Excel::fake() hanya menangkap intent download/store, TIDAK bisa memeriksa isi cell — C7):
  ```php
  Storage::fake('local');
  Excel::store(new ReportsExport($transactions, $summary), 'export.xlsx');
  $sheet = IOFactory::load(Storage::disk('local')->path('export.xlsx'))->getActiveSheet();
  expect($sheet->getCell('C2')->getValue())->toBe("'=HYPERLINK(\"evil\")");
  ```
  (baris 1 = headings, baris 2 = data pertama; kolom C = Petani, kolom D = Kasir; `use PhpOffice\PhpSpreadsheet\IOFactory;` di test): (1) WeighingTransaction dengan `farmer_name_snapshot = '=HYPERLINK("evil")'` → export → cell C2 diawali `'`; (2) Nama normal `"Pak Budi = petani"` (`=` TIDAK di posisi pertama) → cell C2 TIDAK di-prepend (tetap `Pak Budi = petani`); (3) `kasir_name = '=SUM(1)'` → cell D2 diawali `'`. Evidence `.omo/evidence/security-fixes/task-5-formula-injection.txt`
  Commit: Y | fix(security): sanitasi formula prefix di ReportsExport — cegah Excel formula injection

- [x] 6. #9 FarmerDebt: fix implicit binding + dangling transaction
  What to do / Must NOT do: (a) Rename parameter di `FarmerDebtController.php`: `show(FarmerDebt $farmerDebt)` → `show(FarmerDebt $debt)` dan `destroy(FarmerDebt $farmerDebt)` → `destroy(FarmerDebt $debt)`. Route param `{debt}` dari `Route::resource('debts', ...)` (web.php:73) akan match `$debt`. (b) Di `destroy()` (line 134-155), pastikan DB::rollBack() dipanggil di catch block — SUDAH ADA (line 151). **Jangan** mengubah route names atau URL patterns. **Jangan** mengubah index/store methods. **Jangan** mengubah frontend.
  Parallelization: Wave 1 | Blocked by: — | Blocks: —
  References: `app/Http/Controllers/FarmerDebtController.php:124` (show), `app/Http/Controllers/FarmerDebtController.php:134` (destroy), `routes/web.php:73` (resource route — param generated = {debt})
  Acceptance: GET `/debts/{valid_id}` → 200 JSON (bukan 500). DELETE `/debts/{valid_id}` → 302 (success) + DB transaction ter-rollback jika error.
  QA scenarios: Pest test `tests/Feature/Security/FarmerDebtBindingTest.php`: (1) Create FarmerDebt → GET `/debts/{id}` → 200 JSON berisi data; (2) GET `/debts/99999` → 404; (3) Create FarmerDebt → DELETE `/debts/{id}` → 302 (success redirect). Evidence `.omo/evidence/security-fixes/task-9-farmer-debt-binding.txt`
  Commit: Y | fix(perhitungan): ganti param binding di FarmerDebtController show/destroy — fix implicit binding + dangling transaction

- [x] 7. #6b Draft pertahankan debt_paid_amount
  What to do / Must NOT do: Di `WeighingTransactionController.php`, MODIFIKASI dua baris:
  - Line 413 di `calculate()`: `'debt_paid_amount' => $validated['debt_paid_amount'] ?? 0` (HAPUS conditional `$action === 'save_draft' ? 0 :`)
  - Line 454 di `fillTransactionData()`: `'debt_paid_amount' => $validated['debt_paid_amount'] ?? 0` (HAPUS conditional `$action === 'save_draft' ? 0 :`)
  **Jangan** mengubah `finalizeDraft()` — sudah benar menggunakan `$validated['debt_paid_amount']`. Jangan mengubah method signature.
  Parallelization: Wave 2 | Blocked by: — | Blocks: 8 (fix #4 setelah ini)
  References: `app/Http/Controllers/WeighingTransactionController.php:405-415` (calculate), `app/Http/Controllers/WeighingTransactionController.php:454` (fillTransactionData), `app/Http/Controllers/WeighingTransactionController.php:492-537` (finalizeDraft — sudah benar)
  Acceptance: Simpan draft dengan `debt_paid_amount = 100000` → draft record punya `debt_paid_amount = 100000` (bukan 0). Finalize draft → FarmerDebt record terbuat dengan amount 100000.
  QA scenarios: Pest test `tests/Feature/Security/DraftDebtPreserveTest.php`: (1) Simpan draft dengan `debt_paid_amount=100000` → WeighingTransaction->debt_paid_amount === 100000; (2) Finalize draft → FarmerDebt::where('type', 'payment')->latest()->amount === 100000; (3) Simpan draft tanpa hutang (debt_paid_amount=0 atau null) → debt_paid_amount === 0. Evidence `.omo/evidence/security-fixes/task-6b-draft-debt.txt`
  Commit: Y | fix(perhitungan): pertahankan debt_paid_amount saat save_draft — hutang petani tidak hilang

- [x] 8. #4 Blokir hutang bayar > total timbangan
  What to do / Must NOT do: Di `WeighingTransactionController.php`, tambahkan guard DI DALAM blok try (sesudah `$calculation` dihitung, sebelum simpan), untuk ketiga method:
  - `store()` — setelah `$calculation = $this->calculate(...)` dan sebelum `$transaction = new WeighingTransaction;`
  - `update()` — setelah `$calculation = $this->calculate(...)` dan sebelum `$this->fillTransactionData(...)`
  - `finalize()` — setelah `$calculation = $this->calculate(...)` dan sebelum `$this->fillTransactionData(...)`
  Guard yang SAMA di ketiga lokasi (pakai `throw` agar masuk catch → rollback automatis, bukan return):
  ```php
  $debtPaid = $validated['debt_paid_amount'] ?? 0;
  if ($debtPaid > $calculation['gross_total_amount']) {
      throw new \InvalidArgumentException(
          "Hutang bayar (Rp {$debtPaid}) tidak boleh melebihi total timbangan (Rp {$calculation['gross_total_amount']})."
      );
  }
  ```
  INTENT EKSPLISIT (C10): Guard berlaku untuk SEMUA action — store(), update() (baik action 'finalize' MAUPUN 'save_draft'), dan finalize(). TIDAK dikondisikan pada `$action`. Konsekuensi: simpan draft dengan debt > gross juga diblokir dengan error yang sama. Ini aman karena UI Form.tsx sudah meng-clamp `debt_paid_amount` ke `min(currentDebt, grossTotalAmount)` (Form.tsx:668-672) sehingga normalnya tidak terpicu; hanya crafted request yang kena blok.
  Catatan catch: dalam `store()`/`update()`/`finalize()`, blok `catch (\Exception $e)` sudah ada dan menghasilkan `back()->withErrors(['error' => ...])` — guard dengan `\InvalidArgumentException` (subclass Exception) otomatis ditangkap. TIDAK perlu menambah `DB::rollBack()` manual — catch sudah menjalankannya.
  UI ERROR MESSAGE (C5): `errors.error` dari `withErrors(['error' => ...])` TIDAK dirender di mana pun saat ini (verified: tidak ada `errors.error` di resources/js). Tambahkan blok render DI `resources/js/pages/Weighing/Form.tsx`, tepat DI ATAS tombol "SELESAI & CETAK" (antara baris :889 — akhir div ringkasan Sisa Hutang — dan :891 — elemen `<button ... submit('finalize')>`), mengikuti pattern blok `errors.farmer_id` yang sudah ada (:341-344):
  ```tsx
  {errors.error && (
      <p className="text-xs font-semibold text-red-500">{errors.error}</p>
  )}
  ```
  Ini SATU-SATUNYA perubahan UI yang diizinkan guardrail Scope ("kecuali diperlukan untuk error message") — tanpa ini error tidak terlihat user.
  **Jangan** mengubah WeighingTransaction::calculateLoads. Jangan mengubah validasi rules di `validatedData()`. Jangan menambah FormRequest baru.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: —
  References: `app/Http/Controllers/WeighingTransactionController.php:101-156` (store), `app/Http/Controllers/WeighingTransactionController.php:162-209` (update), `app/Http/Controllers/WeighingTransactionController.php:214-265` (finalize), `app/Models/WeighingTransaction.php:259` (`grossTotalAmount`), `app/Models/WeighingTransaction.php:265` (`finalPaidAmount = grossTotalAmount - debtPaidAmount`), `resources/js/pages/Weighing/Form.tsx:341-344` (pattern errors.farmer_id), `resources/js/pages/Weighing/Form.tsx:668-672` (clamp debt_paid_amount), `resources/js/pages/Weighing/Form.tsx:889-891` (posisi blok errors.error baru)
  Acceptance: Input hutang bayar > gross_total_amount pada action APA PUN (finalize/save_draft) → redirect 302 kembali dengan session error mengandung "tidak boleh melebihi" (`assertSessionHasErrors('error')`), error tampil di Form.tsx (blok errors.error), dan TIDAK ada WeighingTransaction/FarmerDebt/CashierCashEntry baru yang tersimpan (transaksi di-rollback).
  QA scenarios: Pest test `tests/Feature/Security/DebtExceedsGrossTest.php`: (1) POST `/weighing` gross 300000 + `debt_paid_amount=500000` → 302 + `assertSessionHasErrors('error')` + `assertDatabaseCount('weighing_transactions', 0)`; (2) POST `/weighing` `debt_paid_amount=300000` (sama dengan gross) → sukses, transaksi tersimpan; (3) POST `/weighing` `debt_paid_amount=200000` (kurang) → sukses; (4) POST `/weighing` dengan `action=save_draft` + crafted `debt_paid_amount=500000` → 302 + `assertSessionHasErrors('error')` + tidak ada draft tersimpan (guard netral terhadap action). Evidence `.omo/evidence/security-fixes/task-4-debt-exceeds-gross.txt`
  Commit: Y | fix(validasi): blokir debt_paid_amount > gross_total_amount + render error di Form — cegah pemasukan negatif

- [x] 9. #6 TOCTOU double-finalize
  What to do / Must NOT do: Di `WeighingTransactionController.php`, pindahkan cek status ke DALAM transaksi dengan pola return + rollback eksplisit (JANGAN pakai abort_if/abort_unless di dalam try — HttpException ditangkap catch menjadi pesan generik; JANGAN biarkan status check di luar transaksi):
  - `update()` (:162-209): HAPUS `abort_unless($weighing->status === 'draft', ...)` di :164. Ganti `DB::beginTransaction();` (:178) menjadi:
    ```php
    DB::beginTransaction();

    try {
        $weighing = WeighingTransaction::query()->whereKey($weighing->id)->lockForUpdate()->firstOrFail();

        if ($weighing->status !== 'draft') {
            DB::rollBack();

            return back()->withErrors(['error' => 'Hanya transaksi draft yang bisa diubah.']);
        }
    ```
    (re-fetch dengan lockForUpdate dari id route binding; jika status bukan draft → rollback + return error. Gunakan model fresh `$weighing` ini untuk sisa body try — termasuk `$weighing->loads()->delete()`, `$weighing->save()`, dst.)
  - `finalize()` (:214-265): HAPUS `abort_unless(...)` di :216 DAN pindahkan pembangunan `$farmer` (:218), `$loads` (:221-230), dan `$validated` (:232-242) KE DALAM try — SAAT INI ketiganya dibangun SEBELUM `DB::beginTransaction()` (:244) dari model hasil route binding, sehingga loads bisa stale bila update() lain commit di antara (C8). Urutan baru di dalam try:
    ```php
    try {
        $weighing = WeighingTransaction::query()->with('loads')->whereKey($weighing->id)->lockForUpdate()->firstOrFail();

        if ($weighing->status !== 'draft') {
            DB::rollBack();

            return back()->withErrors(['error' => 'Hanya transaksi draft yang bisa difinalisasi.']);
        }

        $farmer = $weighing->farmer;
        $loads = $weighing->loads
            ->map(fn ($load) => [
                'gross_weight' => $load->gross_weight,
                'tare_weight' => $load->tare_weight,
                'has_sorting' => $load->has_sorting,
                'sorting_weight' => $load->sorting_weight,
                'sorting_price_per_kg' => $load->sorting_price_per_kg,
            ])
            ->values()
            ->toArray();
        $validated = [ /* sama dengan yang lama, dibaca dari model fresh $weighing */ ];

        $currentDebt = $farmer->calculateDebtBalance();
        $calculation = $this->calculate($validated, $loads, $currentDebt, 'finalize');
        // ... lanjut body try yang sudah ada unchanged
    ```
    Mapping `$loads` IDENTIK dengan blok lama — hanya sumbernya berubah ke model fresh hasil re-fetch (`with('loads')` pada re-fetch memastikan relasi ikut fresh). `$farmer` dan `$validated` juga dari model fresh.
  - Lanjutkan sisa body try yang sudah ada (jangan duplikat blok try).
  **Jangan** mengubah cancel() method. Jangan menambah index database.
  Parallelization: Wave 2 | Blocked by: — | Blocks: —
  References: `app/Http/Controllers/WeighingTransactionController.php:164` (update abort_unless), `app/Http/Controllers/WeighingTransactionController.php:178` (update beginTransaction), `app/Http/Controllers/WeighingTransactionController.php:216` (finalize abort_unless), `app/Http/Controllers/WeighingTransactionController.php:218-230` (finalize $farmer/$loads DI LUAR try — sumber C8), `app/Http/Controllers/WeighingTransactionController.php:232-242` (finalize $validated di luar try), `app/Http/Controllers/WeighingTransactionController.php:244` (finalize beginTransaction)
  Acceptance: Dua request finalisasi bersamaan → hanya satu yang sukses; yang kedua mendapat redirect 302 kembali dengan error, dan hanya satu nota_number yang terbuat (tidak ada duplikat). BATASAN YANG DIKETAHUI (C9): `lockForUpdate()` adalah no-op di SQLite (test DB) — ini adalah InnoDB defense-in-depth untuk produksi; test membuktikan observable behavior jalur sequential (re-fetch + status check), bukan penguncian nyata.
  QA scenarios: Pest test `tests/Feature/Security/DoubleFinalizeTest.php`: (1) Create draft (POST `/weighing` action=draft) → POST `/weighing/{id}/finalize` → 302 success + status 'printed' → POST finalize lagi → 302 back + `assertSessionHasErrors('error')` + `assertDatabaseCount('weighing_transactions', 1)` (tidak ada duplikat); (2) Create draft → update dengan action=finalize → status 'printed' → finalize lagi → 302 back + error; (3) Race di-approximate dengan SEQUENTIAL double-finalize — Pest tidak bisa menjalankan request konkuren dalam satu proses (batasan framework): dua POST finalize berurutan → hanya satu nota_number unik (`WeighingTransaction::whereNotNull('nota_number')->count()` === 1). Evidence `.omo/evidence/security-fixes/task-6-toctou.txt`
  Commit: Y | fix(concurrency): pindahkan cek status + loads ke dalam transaksi + lockForUpdate — anti double-finalize

- [x] 10. Full Pint format + Lint check
  What to do / Must NOT do: Jalankan `vendor/bin/pint --dirty --format agent` untuk memastikan semua file PHP terformat. Jalankan `npm run lint` dan `npm run types:check` untuk memastikan tidak ada error frontend. **Jangan** mengubah kode secara manual untuk lint — biarkan tool yang format.
  Parallelization: Wave 3 | Blocked by: 1-9 | Blocks: 11
  References: `pint.json` (konfigurasi Pint), AGENTS.md "Formatting & Linting" section
  Acceptance: `vendor/bin/pint --test --dirty` return 0; `npm run lint` return 0; `npm run types:check` return 0
  QA scenarios: Shell execution, evidence `.omo/evidence/security-fixes/task-10-pint-lint.txt`
  Commit: N (lint masuk di commit fix terkait, atau commit terpisah jika banyak)

- [x] 11. Jalankan test suite penuh + regression check
  What to do / Must NOT do: Jalankan `php artisan test --compact` — semua test harus hijau (existing + baru). Jalankan `php artisan test --compact --filter=Security` untuk test keamanan baru spesifik. **Jangan** menghapus atau men-disable test yang gagal — investigasi dan fix.
  Parallelization: Wave 3 | Blocked by: 10 | Blocks: —
  References: `tests/Feature/Security/` (semua test baru), `tests/Feature/` (test existing), AGENTS.md "Testing" section
  Acceptance: `php artisan test --compact` return 0 exit code. Semua test keamanan baru (8 test file untuk 9 fix; #7 config tidak butuh test file) PASS.
  QA scenarios: Shell execution, evidence `.omo/evidence/security-fixes/task-11-full-test.txt`
  Commit: N (test sudah termasuk di commit fix)

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — Setiap fix di-diff dengan rencana: #6b zeroing dihapus (baris 413,454), #4 guard debt>gross ditambah, #9 param rename, #7 trustProxies dihapus, #8 status check ditambah, #6 cek pindah ke dalam transaksi, #2 ownership guard, #5 sanitizeFormula, #11 validasi date.
- [x] F2. Code quality review — Pint clean, Pest syntax benar, no new TODOs (kecuali 1 di bootstrap/app.php untuk deploy), no debug var_dump/dd, no hardcoded values
- [x] F3. Real manual QA — Jalankan 1 test dari tiap test file baru, pastikan pass. Jalankan `php artisan test --compact --filter=Security` → hijau. Jalankan full suite → hijau.
- [x] F4. Scope fidelity — Review semua file yang berubah: TIDAK ada perubahan di registrasi, cascade delete, draft IDOR. TIDAK ada dependency baru. TIDAK ada UI berubah selain blok `errors.error` di Weighing/Form.tsx (diizinkan guardrail — diperlukan untuk error message). Semua 9 fix hadir, tidak ada yang terlewat.

## Commit strategy
- **Commit 1** (fix #7): `fix(security): hapus trustProxies('*')` — 1 file: bootstrap/app.php
- **Commit 2** (fix #11): `fix(security): validasi date param di export` — 1 file: ReportsController.php + 1 test
- **Commit 3** (fix #8): `fix(security): enforce users.status inactive` — 1 file: RoleMiddleware.php + 1 test
- **Commit 4** (fix #2): `fix(security): scope CashFlow update/destroy` — 1 file: CashFlowController.php + 1 test
- **Commit 5** (fix #5): `fix(security): sanitasi formula injection Excel` — 1 file: ReportsExport.php + 1 test
- **Commit 6** (fix #9): `fix(binding): rename FarmerDebt param binding` — 1 file: FarmerDebtController.php + 1 test
- **Commit 7** (fix #6b+#4+#6): `fix(perhitungan): draft pertahankan hutang + blokir hutang>gross + TOCTOU` — 2 file: WeighingTransactionController.php + Weighing/Form.tsx (render error saja) + 3 test

Alternatif: squash semua jadi 1 commit `fix(security): 9 security fixes dari audit keamanan` — lebih rapi untuk user. Pilihan: squash (1 commit) atau split (7 commit).

## Success criteria
1. Semua 9 fix diterapkan dengan test passing
2. Full test suite hijau (`php artisan test --compact`)
3. Pint clean (`vendor/bin/pint --test`)
4. Tidak ada dependency baru
5. Tidak ada perubahan UI/frontend selain render error message (`errors.error`) di Weighing/Form.tsx — diizinkan guardrail Scope
6. User bisa melihat perbedaan behavior: draft hutang tersimpan, hutang > gross diblokir, farmer-debts halaman berfungsi, inactive user tidak bisa login
