# Learnings — fix-sortiran-netto-calculation (Todo 1)

## 2026-09-13 — Todo 1: koreksi rumus PHP + feature tests

### Yang dikerjakan
- `app/Models/WeighingTransaction.php` `calculateLoads()`: blok sortiran (`$loadHasSorting`, `$sortingWeight`, `$sortingPricePerKg`, `$sortingDeductionWeight`, `$sortingNetWeight`) dipindah SELURUHNYA ke atas baris `$net`, dan `$net = $initial - $deductionWeight;` → `$net = $initial - $deductionWeight - $sortingNetWeight;`.
- `tests/Feature/WeighingTransactionTest.php`: 6 asersi lama di test 'multi load finalizes as one nota with per-load totals' di-update; 1 test regresi baru ditambahkan.

### TDD RED→GREEN (berhasil)
- RED: test regresi baru ditulis dulu → `net_weight` expected 807.50, actual 855.00 (rumus lama). 22/23 passed, 1 failed.
- GREEN: setelah koreksi rumus + update asersi lama → 23/23 passed, 187 assertions.
- Pint: passed.

### Insight teknis
1. **Pindahkan blok sortiran utuh, bukan sebagian.** `$sortingNetWeight` bergantung pada `$sortingWeight` dan `$sortingDeductionWeight`; `$sortingDeductionWeight` bergantung pada `$loadHasSorting`. Memindah hanya 2 baris terakhir membuat dependency tak terdefinisi → PHP warning + `sortingNetWeight` = 0 → fix diam-diam tidak bekerja. Blok 5 baris harus pindah bersama.
2. **Test lama tanpa sortiran tidak berubah.** Test 'draft can be resumed...' (:144-147) mengasertasi gross_total 3628770.00 dengan dua muatan TANPA sortiran → angka identik setelah fix (regresi nol). Hanya test yang muatannya ber-sortiran yang berubah.
3. **Test sorting-deduction lain tidak perlu diubah** ('sorting deduction percentage applied...', 'zero keeps legacy', '100 percent zeroes', 'survives draft save') — mereka hanya mengasertasi field sortiran (`sorting_deduction_weight`, `sorting_net_weight`, `sorting_total_amount`) yang nilainya TIDAK berubah oleh fix; hanya `net_weight`/`palm_total_amount`/`gross_total_amount` yang berubah.
4. **Angka kunci**: muatan 1000/100, ded 5%, sortiran 50 @5% → netto bersih 807.50 (bukan 855), palm 1.615.000, sortiran 23.750, total 1.638.750. Cash entry = total.
5. **LSP noise pre-existing** di test file (Pest macros `actingAs` dll) — bukan regresi, abaikan.
6. **File lain yang berubah di working tree** (`resources/js/lib/utils.ts`, `tests/JS/utils.test.ts`) adalah pekerjaan Todo 3 (worker paralel) — jangan disentuh oleh Todo 1.

### Gotcha untuk Todo 2 (guard controller)
- Todo 2 mengedit file test yang SAMA (`tests/Feature/WeighingTransactionTest.php`) — harus SEQUENTIAL setelah Todo 1. Test regresi baru Todo 1 ada di baris ~76-104 (setelah test multi-load).
- Test 'sorting deduction percentage applied to sorting total' (gross 1000/tare 200/sorting 100) — dengan fix, netto bersih muatan = 800 − 24 − 95 = 681; test itu tidak mengasertasi net_weight jadi tetap hijau.

## 2026-09-13 — Todo 2: guard validasi sortiran <= netto kotor (store/update/finalize)

### Yang dikerjakan
- `app/Http/Controllers/WeighingTransactionController.php`:
  - `loadsError()`: guard baru setelah cek gross<=tare — `has_sorting && sorting_weight > gross_weight - tare_weight` → return `'Berat sortiran muatan #N tidak boleh melebihi netto kotor.'`. Otomatis berlaku untuk store (:115-117) dan update (:176-178) karena keduanya memanggil `loadsError()`.
  - `finalize()`: guard baru SETELAH `$validated` tersusun, SEBELUM `$calculation = $this->calculate(...)` — iterasi `$weighing->loads` (sudah di-load via `with('loads')` di :235): jika ada muatan `has_sorting && sorting_weight > gross - tare` → `DB::rollBack()` + `return back()->withErrors(['error' => 'Tidak bisa finalisasi: berat sortiran melebihi netto kotor muatan #N.'])`. Melindungi draft lama yang tersimpan sebelum guard ada.
- `tests/Feature/WeighingTransactionTest.php`: 3 test baru (reject store, accept within netto, finalize rejects old draft).

### TDD RED→GREEN (QA failure scenarios, sesuai plan)
- RED (1): guard loadsError dihapus sementara → test (a) merah ("Session is missing expected key [errors]" — transaksi tersimpan tanpa error). Pasang kembali → hijau.
- RED (2): guard finalize dihapus sementara → test (c) merah (draft terfinalisasi tanpa error). Pasang kembali → hijau.
- GREEN final: 26/26 passed, 198 assertions. Pint passed.

### Insight teknis
1. **Guard finalize harus pakai `$weighing->loads` (model), bukan `$validated['loads']`.** Draft lama bisa punya data yang tidak lolos validasi payload; `$validated` di finalize dibangun dari model, tapi guard di `loadsError()` tidak pernah dijalankan untuk draft lama (hanya store/update). Iterasi model langsung = sumber kebenaran.
2. **`loads()` relationship sudah `orderBy('seq_no')`** (WeighingTransaction.php:126) — jadi `$i + 1` di guard finalize == `seq_no`. Aman.
3. **Cast decimal:2 mengembalikan string** ("1000.00") — perbandingan numerik PHP tetap benar (`"900.00" > "1000.00" - "200.00"` → 900 > 800 → true). Tidak perlu cast manual.
4. **`WeighingLoad::update()` via Eloquent langsung** untuk simulasi data lama: `sorting_weight` ada di `$fillable` → update berhasil tanpa factory.
5. **Test (b) angka**: gross 1000/tare 200 → initial 800; ded 3% → 24; sorting 750, `sorting_deduction_percentage` default 0 → sorting_net 750; net = 800 − 24 − 750 = **26.00**. Guard lolos karena 750 ≤ 800.
6. **`assertSessionHasNoErrors()`** pada test (b) membuktikan tidak ada error 'loads' (dan error lain) — lebih kuat dari sekadar assertRedirect.
7. **LSP noise pre-existing** (`actingAs` undefined di test file, `@/` alias di TS test) — bukan regresi, abaikan (sudah tercatat di Todo 1).
8. **QA failure scenario aman dilakukan** dengan edit → test → revert edit; pastikan string edit unik agar revert presisi. Jangan tinggalkan marker QA-TEMP-DISABLED di kode.

## 2026-09-13 — Todo 4: baterai verifikasi penuh (backend + JS + format + lint + types)

### Hasil gate (semua HIJAU, exit 0, berurutan)
1. `composer test` → `{"tool":"pint","result":"passed"}{"tool":"pest","result":"passed","tests":127,"passed":127,"assertions":672,"duration_ms":12312}` — 127 tests (123 baseline + 1 regresi Todo 1 + 3 guard Todo 2), 672 assertions.
2. `npm run test:js` → 4 test files / 87 tests passed (vitest v4.1.5).
3. `vendor/bin/pint --format agent` → `{"tool":"pint","result":"passed"}`.
4. `npm run format && npm run lint && npm run types:check` → prettier semua `(unchanged)`, eslint `--fix` tanpa output, `tsc --noEmit` exit 0 tanpa output.

### Insight teknis
1. **Tidak ada test merah di luar scope** — tidak perlu update asersi tambahan. File test lain dengan fixture sortiran (`printer-service.test.ts`, `weighing-form.test.ts`, `ReportsExportTest.php`, `DashboardTest.php`) semuanya hijau tanpa perubahan: mayoritas mengasertasi field sortiran yang nilainya tidak berubah oleh fix, atau transaksi tanpa sortiran (angka identik).
2. **`git status --short` setelah lint `--fix`**: hanya 5 file Todo 1-3 yang berubah (`WeighingTransactionController.php`, `WeighingTransaction.php`, `utils.ts`, `WeighingTransactionTest.php`, `utils.test.ts`) + `.omo/` untracked. Tidak ada file lain yang disentuh — lint tidak memperkenalkan perubahan liar.
3. **LSP noise pre-existing dikonfirmasi lagi** di `tests/JS/*.test.ts` (`@/` alias hanya dikenal vitest) dan `tests/Feature/WeighingTransactionTest.php` (`actingAs` Pest macro) + `routes/web.php` (`user()` helper) — BUKAN regresi, semua gate CLI hijau.
4. **Evidence lengkap** di `.omo/evidence/task-4-fix-sortiran-netto-calculation.txt` (output keempat gate + git status sebelum/sesudah + kesimpulan).
5. **Todo 4 selesai tanpa perubahan kode** — murni verifikasi; tidak ada commit (sesuai instruksi, biarkan di working tree).
