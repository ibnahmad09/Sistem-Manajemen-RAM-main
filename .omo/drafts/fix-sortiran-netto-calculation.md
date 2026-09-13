---
slug: fix-sortiran-netto-calculation
status: approved
intent: clear
review_required: false
pending-action: write .omo/plans/fix-sortiran-netto-calculation.md
approach: Perbaiki rumus calculateLoads() (PHP backend + mirror TS frontend) agar netto bersih dikurangi berat bersih sortiran sebelum dikalikan harga sawit; tambah guard validasi berat sortiran <= netto kotor; update asersi test lama yang mengunci perilaku buggy + tambah test regresi.
---

# Draft: fix-sortiran-netto-calculation

## Components (topology ledger)
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
- Backend formula (app/Models/WeighingTransaction.php::calculateLoads) | netto bersih dikurangi sorting_net_weight | active | app/Models/WeighingTransaction.php:198-287
- Frontend mirror (resources/js/lib/utils.ts::calculateLoads) | sama | active | resources/js/lib/utils.ts:125-226
- Guard input (WeighingTransactionController::loadsError) | tolak sorting_weight > netto kotor | active | app/Http/Controllers/WeighingTransactionController.php:392-401
- Tests (feature Pest + vitest) | update asersi lama + test regresi baru | active | tests/Feature/WeighingTransactionTest.php, tests/JS/utils.test.ts

## Open assumptions (announced defaults)
<!-- assumption | adopted default | rationale | reversible? -->
- Basis angka contoh user: netto bersih = 855 (bukan 885) | 855 | konsisten dengan 900 - 5%; user konfirmasi "maksud saya 855" | - (sudah dikonfirmasi)
- Guard ditambahkan | ikut | mencegah netto negatif di nota | user approve "ikuti"
- Data existing (printed/revised) tidak di-backfill | perbaikan hanya untuk perhitungan baru + draft yang difinalisasi ulang | angka tersimpan statis; backfill = usaha terpisah | ya (jika user minta backfill, scope baru)

## Findings (cited - path:lines)
- BUG inti: app/Models/WeighingTransaction.php:223 `$net = $initial - $deductionWeight;` — sortiran tidak dikurangkan dari netto. `$sortingNetWeight` dihitung di :228 tapi hanya dipakai untuk `$sortingTotal` (:229); `$palmTotalAmount += $net * $palmPricePerKg;` (:240) dan `$grossTotalAmount = $palmTotalAmount + $totalSortingAmount;` (:259) ikut salah.
- Mirror TS identik: resources/js/lib/utils.ts:147 `const net = initial - deductionWeight;`; `sortingNetWeight` di :154 tidak dipakai untuk net; `palmTotalAmount` di :193-196.
- Test mengunci perilaku buggy: tests/Feature/WeighingTransactionTest.php:56,59,60,61,68,71 (net 1406.50 / palm 3628770.00 / gross+final+cash 3653770.00 / secondLoad net 630.50) dan tests/JS/utils.test.ts:96 (grossTotalAmount 2049580).
- Database menyimpan angka statis pada saat finalisasi; transaksi `printed/revised` TIDAK terpengaruh fix. Draft (status draft) yang dibuka lalu difinalisasi akan dihitung ulang: WeighingTransactionController::finalize (app/Http/Controllers/WeighingTransactionController.php:245-269) membaca input mentah dari weighing_loads lalu memanggil calculate() -> calculateLoads().
- calculateTransaction (resources/js/lib/utils.ts:229) TIDAK punya pemanggil (grep seluruh resources/js: hanya definisi di :229) — dead code, di luar scope.
- Default fixture test: deduction 3%, palm price 2580, sorting price 500 (tests/Pest.php:48-63). sorting_deduction_percentage default 0 bila tidak dikirim.
- Perintah test: PHP `php artisan test --compact --filter=WeighingTransactionTest`; JS `npm run test:js` (vitest). Format: `vendor/bin/pint --format agent`; `npm run format && npm run lint && npm run types:check` (AGENTS.md).

## Decisions (with rationale)
- D1: Netto bersih = initial - deductionWeight - sortingNetWeight, di KEDUA sisi (PHP + TS). Alasan: sortiran adalah buah yang dipisahkan dari muatan — beratnya tidak boleh dihargai dua kali (sebagai sawit premium DAN sebagai sortiran). gross_total_amount tetap = palm + sorting, sehingga struktur pembayaran petani (total bayar = sawit + sortiran) dipertahankan dan rantai utang/kas/nota ikut benar tanpa perubahan lain.
- D2: Guard di loadsError() DAN finalize(): tolak `has_sorting && sorting_weight > gross_weight - tare_weight`. Alasan: cegah input yang secara fisik mustahil (berat sortiran melebihi muatan itu sendiri) yang menghasilkan netto negatif / nota nonsense; berpola sama dengan guard `gross <= tare` yang sudah ada. sorting_weight yang dibandingkan adalah berat KOTOR sortiran (sebelum potongan sortiran sendiri). Catatan jujur: guard bersifat physical-sanity — menjamin sorting_weight <= netto kotor, TIDAK menjamin netto >= 0 pada semua kombinasi potongan (kasus patologis sempit antara `initial - deductionWeight` dan `initial` tetap lolos; diterima sebagai risiko sesuai persetujuan user atas guard sederhana). Guard di finalize() melindungi draft lama (tersimpan sebelum fix) dari netto negatif saat difinalisasi ulang.
- D3: Test yang mengunci perilaku lama di-UPDATE ke angka baru (tidak dihapus) + test regresi baru ditambahkan untuk skenario user.
- D4: Tidak ada backfill. Hanya perhitungan baru (transaksi baru, draft yang difinalisasi ulang) yang memakai rumus baru.
- D5: calculateTransaction tetap dibiarkan (dead code) — MUST NOT touch.

## Scope IN
- Rumus calculateLoads() di app/Models/WeighingTransaction.php
- Rumus calculateLoads() di resources/js/lib/utils.ts
- Guard validasi di WeighingTransactionController::loadsError() DAN finalize() (draft lama ber-sortiran invalid)
- Update asersi test lama + test regresi baru (feature Pest + vitest)

## Scope OUT (Must NOT have)
- Backfill / migrasi data transaksi yang sudah printed/revised
- Perubahan UI (Form.tsx, Success, Show, receipt/printer) — preview otomatis ikut benar
- calculateTransaction (resources/js/lib/utils.ts:229) — dead code
- Perubahan skema DB, routes, atau alur controller selain guard
- Perubahan rounding mode / kebijakan harga

## Open questions
- (kosong — semua fork sudah dijawab user: netto = 855, guard ikut, tanpa backfill)

## Approval gate
status: approved
<!-- User menjawab semua fork (2026-09-13): (1) netto bersih yang dimaksud = 855 kg; (2) guard diikutkan; (3) pertanyaan "apakah berpengaruh ke DB yang sudah ada" terjawab: transaksi printed tidak berubah, draft yang dibuka ulang akan terhitung ulang dengan rumus baru. Persetujuan untuk menulis plan tercapai; pending-action: tulis .omo/plans/fix-sortiran-netto-calculation.md -->