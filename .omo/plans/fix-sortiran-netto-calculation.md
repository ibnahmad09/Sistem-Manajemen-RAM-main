# fix-sortiran-netto-calculation - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** Ketika kasir mengisi sortiran, berat bersih sortiran akan benar-benar dikurangi dari netto bersih sebelum dihitung harga sawit — sehingga petani tidak dibayar dua kali untuk buah yang sama. Total yang diterima petani menjadi: (netto bersih − berat sortiran) × harga sawit + berat sortiran × harga sortiran.

**Why this approach:** Sortiran adalah buah yang dikeluarkan dari muatan; beratnya tidak boleh dihargai sebagai sawit premium sekaligus sebagai sortiran. Cukup satu koreksi di rumus kalkulasi (di backend dan di pratinjau layar) — semua angka turunan (utang, kasir, nota) ikut benar dengan sendirinya.

**What it will NOT do:** Tidak mengubah nota lama yang sudah disimpan, tidak mengubah tampilan form, tidak memperbaiki data transaksi lama (itu usaha terpisah jika suatu saat diminta), dan tidak menyentuh kode mati yang tidak dipakai.

**Effort:** Short
**Risk:** Low - perubahan terisolasi di satu fungsi kalkulasi (dua file) + satu validasi input, semua angka tercakup test.
**Decisions to sanity-check:** Netto bersih = netto kotor − potongan wajib − berat BERSIH sortiran (bukan berat kotor). Validasi baru: berat sortiran tidak boleh melebihi netto kotor muatan.

Your next move: jalankan `$start-work fix-sortiran-netto-calculation` (atau minta high-accuracy review dulu). Detail eksekusi lengkap di bawah.

---

> TL;DR (machine): Short effort, low risk - 2 file produksi + 1 guard + 2 suite test; koreksi rumus netto bersih pada sortiran (PHP + TS) dengan test regresi skenario user.

## Scope
### Must have
- Koreksi `calculateLoads()` di `app/Models/WeighingTransaction.php` — netto bersih per muatan dikurangi berat bersih sortiran.
- Koreksi mirror `calculateLoads()` di `resources/js/lib/utils.ts` — identik, agar pratinjau form konsisten dengan nota.
- Guard validasi di `WeighingTransactionController::loadsError()` — tolak `has_sorting && sorting_weight > gross_weight - tare_weight`.
- Update asersi test yang mengunci perilaku lama ke angka baru; tambah test regresi skenario user (feature Pest + vitest).

### Must NOT have (guardrails, anti-slop, scope boundaries)
- TIDAK ada backfill/migrasi data transaksi yang statusnya `printed`/`revised` — angka tersimpan statis, tidak diubah.
- TIDAK menyentuh `calculateTransaction` (`resources/js/lib/utils.ts:229`) — dead code tanpa pemanggil.
- TIDAK mengubah Form.tsx / Success / Show / receipt / printer — display membaca nilai tersimpan; preview otomatis konsisten setelah mirror di-fix.
- TIDAK mengubah skema DB, routes, kebijakan harga, atau alur controller selain guard.
- TIDAK menambah fitur baru (mis. baris tampilan \"dikurangi berat sortiran\" di UI).
- BATASAN guard: guard hanya physical-sanity (`sorting_weight <= netto kotor`); TIDAK menambah validasi dua-tahap yang menjamin netto >= 0 pada semua kombinasi potongan (kasus patologis sempit diterima sebagai risiko).

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD untuk test regresi baru (tulis dulu asersi dengan angka yang diharapkan, pastikan merah sebelum koreksi rumus → hijau setelahnya); asersi test lama di-update dalam todo yang sama. Framework: Pest v4 (backend) + Vitest (JS).
- Evidence: `.omo/evidence/task-N-fix-sortiran-netto-calculation.txt` untuk setiap todo (capture output perintah test/failure).

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
- **Wave 1 (backend):** Todo 1 (rumus PHP + feature tests) dan Todo 2 (guard + feature test) — file produksi berbeda (model vs controller), satu worker menjalankan sekuensial.
- **Wave 2 (frontend):** Todo 3 (mirror TS + vitest) — independen dari Wave 1.
- **Wave 3 (baterai penuh):** Todo 4 — after 1-3.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | - | 4 | 3 (2 hanya SEQUENTIAL — keduanya edit file test yang sama: tests/Feature/WeighingTransactionTest.php) |
| 2 | - | 4 | 3 (1 hanya SEQUENTIAL — keduanya edit tests/Feature/WeighingTransactionTest.php) |
| 3 | - | 4 | 1, 2 |
| 4 | 1, 2, 3 | - | - |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Koreksi rumus `calculateLoads()` PHP (netto bersih − berat bersih sortiran) + update/add feature tests
  What to do / Must NOT do: Di dalam loop `foreach ($loads ...)` di `calculateLoads()`, PINDahkan SELURUH blok sortiran baris 224-228 (`$loadHasSorting`, `$sortingWeight`, `$sortingPricePerKg`, `$sortingDeductionWeight`, `$sortingNetWeight`) ke ATAS baris `$net` (baris 223) — jangan pindah hanya baris 227-228, karena keduanya bergantung pada 224-226; memindah hanya 2 baris membuat variabel dependency tak terdefinisi → PHP warning + `sortingNetWeight` = 0 → fix diam-diam tidak bekerja. Lalu ubah `$net = $initial - $deductionWeight;` (baris 223) menjadi `$net = $initial - $deductionWeight - $sortingNetWeight;`. Detail: `$sortingNetWeight` harus sudah terdefinisi saat `$net` dihitung; variabel lain (`$sortingTotal`, akumulasi `$totalNet`, `$palmTotalAmount`, `$grossTotalAmount = $palmTotalAmount + $totalSortingAmount`) TIDAK berubah strukturnya — hanya nilainya yang ikut benar. JANGAN mengubah rounding, guard gross<=tare, atau signature method. JANGAN hapus test apa pun — hanya UPDATE asersi + TAMBAH test.
  Parallelization: Wave 1 | Blocked by: - | Blocks: 4
  References (executor has NO interview context - be exhaustive):
  - Rumus: `app/Models/WeighingTransaction.php:218-241` (loop), utamanya :222-229 dan :240. Konteks method: :198-287.
  - Test yang di-UPDATE: `tests/Feature/WeighingTransactionTest.php:38-74` ('multi load finalizes as one nota with per-load totals') — baris yang berubah: :56 `net_weight` 1406.50 → **1356.50**; :59 `palm_total_amount` 3628770.00 → **3499770.00**; :60 `gross_total_amount` 3653770.00 → **3524770.00**; :61 `final_paid_amount_rounded` 3653770.00 → **3524770.00**; :68 `secondLoad->net_weight` 630.50 → **580.50**; :71 cash entry amount 3653770.00 → **3524770.00**.
  - Helper fixture: `tests/Pest.php:48-63` (`weighingFormData`: default ded 3%, palm 2580, sorting price 500; `createTestFarmer`).
  - Test BARU (regresi skenario user, tulis dulu lalu lihat merah sebelum koreksi rumus): POST `route('weighing.store')` sebagai cashier dengan `weighingFormData($farmer, ['loads' => [['gross_weight' => 1000, 'tare_weight' => 100, 'has_sorting' => true, 'sorting_weight' => 50]], 'deduction_percentage' => 5, 'palm_price_per_kg' => 2000, 'sorting_price_per_kg' => 500, 'sorting_deduction_percentage' => 5] + ['action' => 'finalize'])`. Asersi pada `WeighingTransaction::first()`: `initial_weight` 900.00, `deduction_weight` 45.00, `net_weight` **807.50**, `sorting_deduction_weight` 2.50, `sorting_net_weight` 47.50, `sorting_total_amount` 23750.00, `palm_total_amount` **1615000.00**, `gross_total_amount` **1638750.00**, `final_paid_amount_rounded` **1638750.00**; dan `CashierCashEntry::where('type','farmer_payment')->first()->amount` **1638750.00**.
  - Hitung manual (untuk QA): netto kotor 1000−100=900; potongan 5%×900=45; netto pra-sortiran 855; berat bersih sortiran 50−5%=47,5; netto bersih FIX = 855−47,5=807,5; palm = 807,5×2000=1.615.000; sortiran = 47,5×500=23.750; total = 1.638.750.
  Acceptance criteria (agent-executable): `php artisan test --compact --filter=WeighingTransactionTest` → semua hijau, termasuk test regresi baru; angka sesuai tabel di atas.
  QA scenarios (name the exact tool + invocation): happy — jalankan perintah acceptance di atas, capture ke `.omo/evidence/task-1-fix-sortiran-netto-calculation.txt`. failure — sebelum menerapkan koreksi rumus, jalankan test regresi baru → test harus MERAH (net_weight 855 ≠ 807.50, palm 1710000 ≠ 1615000); setelah koreksi → hijau. Evidence: output kedua run.
  Commit: Y | fix(weighing): kurangi netto bersih dengan berat bersih sortiran

- [x] 2. Tambah guard validasi sortiran <= netto kotor (store/update DAN finalize) + feature tests
  What to do / Must NOT do: DUA tempat di `app/Http/Controllers/WeighingTransactionController.php`:
  (a) `loadsError()` (baris 392-401), di dalam `foreach` — setelah cek `$load['gross_weight'] <= $load['tare_weight']` — tambahkan: jika `$load['has_sorting'] && $load['sorting_weight'] > $load['gross_weight'] - $load['tare_weight']`, return `'Berat sortiran muatan #'.($index + 1).' tidak boleh melebihi netto kotor.'` (guard ini otomatis berlaku untuk store/update karena keduanya memanggil loadsError di :115-117 dan :176-178).
  (b) method `finalize()` (baris 228-290): SEKITAR baris 268-269, SETELAH `$validated` tersusun dan SEBELUM `$calculation = $this->calculate(...)` (:269) — iterasi `$weighing->loads` (sudah di-load di :235): jika ada muatan dengan `has_sorting && sorting_weight > gross_weight - tare_weight`, `DB::rollBack()` lalu `return back()->withErrors(['error' => 'Tidak bisa finalisasi: berat sortiran melebihi netto kotor muatan #'.($i+1).'.']);` — melindungi DRAFT LAMA (tersimpan sebelum fix; guard tidak ada saat itu) dari netto negatif saat difinalisasi ulang.
  JANGAN mengubah guard lain, validasi lain, atau alur lain. JANGAN menebalkan guard menjadi dua-tahap (netto >= 0 pada semua kombinasi potongan) — di luar scope (lihat Must NOT have).
  Test BARU (3): (a) tolak — POST `weighing.store` gross 1000/tare 200/has_sorting true/sorting_weight 900 → `assertSessionHasErrors('loads')` dan `WeighingTransaction::count() === 0`; (b) kasus lolos — gross 1000/tare 200/sorting_weight 750 (netto kotor 800) → redirect sukses tanpa error 'loads', transaksi tersimpan dengan `net_weight` = `'26.00'` (net = 800 − 3%×800 − 750); (c) draft lama + finalize — buat draft valid via POST store (gross 1000/tare 200/sorting_weight 50), lalu `$draft->loads()->first()->update(['sorting_weight' => 900])` langsung via Eloquent (mensimulasikan data lama yang tersimpan sebelum guard), lalu POST `route('weighing.finalize', $draft->id)` → `assertSessionHasErrors('error')`, `$draft->refresh()->status` tetap `'draft'`, dan `CashierCashEntry::count() === 0`.
  Parallelization: Wave 1 | Blocked by: - | Blocks: 4
  References (executor has NO interview context - be exhaustive): `app/Http/Controllers/WeighingTransactionController.php:392-401` (loadsError), :115-117 (store), :176-178 (update), :228-290 (finalize, titik sisip ~:268-269), validasi payload `sorting_weight`: :353-356; helper: `tests/Pest.php:48-63`; pola asersi: `tests/Feature/WeighingTransactionTest.php:403-513` (pola send errors) dan :38-74 (pola asersi transaksi + cash entry); contoh akses loads di test: :65 (`$transaction->loads->firstWhere('seq_no', 2)`) dan `update()` Eloquent langsung (tanpa factory — factory hanya untuk User, lihat AGENTS.md).
  Acceptance criteria (agent-executable): tiga test baru hijau via `php artisan test --compact --filter=WeighingTransactionTest`; `WeighingTransaction::count()` = 0 pada kasus (a); `net_weight` = `'26.00'` pada kasus (b); finalize ditolak + status tetap 'draft' pada kasus (c).
  QA scenarios: happy — jalankan filter di atas, capture ke `.omo/evidence/task-2-fix-sortiran-netto-calculation.txt`. failure — (1) hapus sementara guard di loadsError → test (a) merah (transaksi tersimpan) dan test (b) tetap hijau; (2) hapus sementara guard di finalize → test (c) merah (draft terfinalisasi dengan netto negatif); pasang kembali → hijau semua. Evidence: output kedua run.
  Commit: Y | fix(weighing): tolak berat sortiran melebihi netto kotor (store/update/finalize)

- [x] 3. Koreksi mirror TS `calculateLoads()` + update/add vitest
  What to do / Must NOT do: Di `resources/js/lib/utils.ts` `calculateLoads()` (baris 140-173), urutkan ulang body `perLoad.map`: pindahkan SELURUH blok baris 148-154 (`loadHasSorting`, `sortingWeight`, `sortingPricePerKg`, `sortingDeductionWeight`, `sortingNetWeight`) KE ATAS `const net` (baris 147) — jangan sisakan dependency di bawahnya (di TS, `const` yang direferensikan sebelum dideklarasi = TDZ ReferenceError → vitest crash, bukan sekadar merah). Lalu ubah `const net = initial - deductionWeight;` menjadi `const net = initial - deductionWeight - sortingNetWeight;`. JANGAN mengubah struktur kembalian, `Math.round` policy, atau fungsi `calculateTransaction` (mati/di luar scope). Test: UPDATE `tests/JS/utils.test.ts` baris 96 `grossTotalAmount` 2049580 → **1804480** dan TAMBAH asersi di test yang sama: `result.perLoad[0].netWeight` → **681**, `result.netWeight` → **681**, `result.palmTotalAmount` → **1756980**. TAMBAH test baru (skenario user): input gross 1000/tare 100/hasDeduction true/deductionPercentage 5/palmPricePerKg 2000/sortingWeight 50/sortingDeductionPercentage 5/sortingPricePerKg 500 → `netWeight` **807.5**, `sortingNetWeight` **47.5**, `sortingTotalAmount` **23750**, `palmTotalAmount` **1615000**, `grossTotalAmount` **1638750**. Test 'keeps legacy behavior when sorting deduction percentage is zero' dan 'defaults to zero' TIDAK berubah (tidak mengasertakan netWeight/palmTotal/grossTotal).
  Parallelization: Wave 2 | Blocked by: - | Blocks: 4
  References (executor has NO interview context - be exhaustive): `resources/js/lib/utils.ts:125-226` (fungsi, loop :140-173, agregasi :175-225); test: `tests/JS/utils.test.ts:65-117` (describe calculateLoads, fixture :66-82); pemanggil form: `resources/js/pages/Weighing/Form.tsx:140` (tidak perlu diubah — preview membaca hasil fungsi).
  Acceptance criteria (agent-executable): `npm run test:js -- tests/JS/utils.test.ts` → hijau dengan angka di atas.
  QA scenarios: happy — jalankan perintah acceptance, capture ke `.omo/evidence/task-3-fix-sortiran-netto-calculation.txt`. failure — tulis dulu test regresi baru sebelum koreksi fungsi → merah (net 855 ≠ 807.5); setelah koreksi → hijau. Evidence: kedua run.
  Commit: Y | fix(weighing): sinkronkan kalkulasi sortiran pada preview form

- [x] 4. Baterai verifikasi penuh (backend + JS + format + lint + types)
  What to do / Must NOT do: Jalankan seluruh gate: (1) `composer test` (suite penuh backend + unit; jangan `--filter`); (2) `npm run test:js` (seluruh vitest); (3) `vendor/bin/pint --format agent` (file PHP yang disentuh); (4) `npm run format && npm run lint && npm run types:check`. JANGAN perbaiki kegagalan di luar scope fix ini — jika ada test lain merah, STOP dan laporkan (bisa jadi asersi lama di file lain perlu update, mis. `tests/Feature/CashFlowTest.php`, `ReportsExportTest.php`, `DashboardTest.php` yang menyentuh sorting — evaluasi satu per satu dengan angka yang sama: transaksi ber-sortiran akan berubah nilainya, transaksi tanpa sortiran identik). JANGAN menghapus test tanpa approval.
  Parallelization: Wave 3 | Blocked by: 1, 2, 3 | Blocks: -
  References (executor has NO interview context - be exhaustive): AGENTS.md (perintah: `composer test`, `npm run format && npm run lint && npm run types:check`, `vendor/bin/pint --format agent`); package.json scripts (`test:js`: vitest, :14); file test lain dengan fixture/asersi sortiran (mayoritas statis — hanya dicek jika merah): `tests/JS/printer-service.test.ts`, `tests/JS/weighing-form.test.ts`, `tests/Feature/ReportsExportTest.php`, `tests/Feature/DashboardTest.php`.
  Acceptance criteria (agent-executable): keempat gate di atas hijau tanpa error; output lengkap di `.omo/evidence/task-4-fix-sortiran-netto-calculation.txt`.
  QA scenarios: happy — jalankan keempat gate berurutan, semua exit 0. failure — jika satu gate merah: identifikasi apakah test itu mengasertasi transaksi BERSORTIRAN (nilai berubah → update asersi ke angka yang dihitung ulang dengan rumus fix) atau TANPA sortiran (nilai identik → cari penyebab lain, jangan asal ubah); sertakan output gagal di bukti.
  Commit: Y | chore(weighing): verifikasi baterai penuh pasca koreksi sortiran

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — bandingkan hasil akhir vs daftar todo: setiap acceptance criteria terpenuhi, tidak ada todo terlewat; angka nota pada test regresi = 807.5 / 1.615.000 / 23.750 / 1.638.750.
- [x] F2. Code quality review — `vendor/bin/pint --format agent` + `npm run lint` + `npm run types:check` bersih; diff hanya menyentuh: WeighingTransaction.php (rumus), utils.ts (rumus mirror), WeighingTransactionController.php (guard), file test (asersi + test baru) — tidak ada file lain yang berubah.
- [x] F3. Real smoke QA (agent-executed) — jalankan ulang skenario user sebagai smoke test: POST weighing.store dengan input contoh (1000/100, potongan 5%, harga 2000, sortiran 50 @5% harga 500), verifikasi via feature test + query DB `SELECT net_weight, palm_total_amount, sorting_net_weight, sorting_total_amount, gross_total_amount, final_paid_amount_rounded FROM weighing_transactions` → 807.50 / 1615000.00 / 47.50 / 23750.00 / 1638750.00 / 1638750.00, dan `CashierCashEntry.amount` = 1638750.00. Capture output ke `.omo/evidence/final-f3-fix-sortiran-netto-calculation.txt`.
- [x] F4. Scope fidelity — tidak ada backfill data lama, tidak ada perubahan UI/dead code/skema; diff terbatas pada file yang terdaftar di F2.

## Commit strategy
- Satu commit per todo 1-3 (`fix(weighing): ...`), plus todo 4 (`chore(weighing): ...`) jika menghasilkan perubahan. Message sesuai baris Commit tiap todo.
- Jangan squash; riwayat tetap per-ubah agar revert mudah. Jangan commit `.omo/` artifacts.
- Ikuti aturan repo: jangan hapus test tanpa approval; jalankan pint/prettier sebelum commit (AGENTS.md).

## Success criteria
- Dengan sortiran: netto bersih dan total sawit menurun sesuai berat bersih sortiran; total yang diterima petani = total sawit + total sortiran (contoh: 807,5 kg → Rp 1.615.000; + Rp 23.750 = Rp 1.638.750).
- Tanpa sortiran: semua angka IDENTIK dengan sebelumnya (regresi nol; test lama tanpa sortiran tetap hijau di angka lama).
- Input sortiran melebihi netto kotor ditolak dengan pesan error yang jelas.
- Preview form (TS mirror) konsisten dengan nota tersimpan (PHP).
- `composer test` + `npm run test:js` + pint + lint + types:check semuanya hijau.