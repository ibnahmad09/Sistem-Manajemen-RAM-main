# fix-sortiran-gross-weight - Work Plan

> Extended 2026-09-13: menambahkan Todo 3 (nota/receipt tampilkan berat GROSS), Todo 4 (Option A output card per-muatan), Todo 5 (Option B restrukturisasi panel kalkulasi), Todo 6 (baterai penuh + build). Todo 1-2 tidak berubah. Semua keputusan sudah dikonfirmasi user.

## TL;DR (For humans)

**What you'll get:**
1. Koreksi rumus di PHP + TS: kolom sawit dikurangi berat **KOTOR** sortiran (bukan berat bersih). Total petani berubah dari Rp 1.638.750 → **Rp 1.633.750** pada skenario user (netto sawit 805 kg).
2. Baris deduksi SORTIRAN di nota layar (`Success.tsx`) & receipt thermal (`receipt-builder.ts`) ikut menampilkan berat **KOTOR** (−50 kg), sehingga aritmetika yang tercetak cocok dengan netto sawit 805 (900 − 45 − 50 = 805).
3. Tambahan tampilan di halaman input timbangan (`Form.tsx`) — **Option A**: kartu "Hasil Hitung" per-muatan di dalam tiap kartu muatan; **Option B**: panel "Kalkulasi Pembayaran" direstrukturisasi jadi seksi berlabel (HARGA / BERAT / NILAI / PEMBAYARAN) dengan keterangan rumus tiap baris biar user tidak bingung.

**Why this approach:** Sortiran 50kg adalah buah yang dikeluarkan sepenuhnya dari kolom sawit; potongan sortiran 5% hanya memengaruhi harga sortiran (47,5 × 500 = 23.750), bukan mengurangi lagi kolom sawit. Cukup ganti `sortingNetWeight` → `sortingWeight` pada satu baris formula di masing-masing file — dan tampilkan berat yang sama (gross) di semua titik yang menggambarkan deduksi sawit.

**What it will NOT do:** Tidak mengubah sortiran payment (tetap net × harga), tidak mengubah potongan kualitas sawit, tidak menyentuh guard, dead code, draft, atau API. Bagian HARGA nota (pembayaran sortiran Rp23.750) tetap pakai berat NET (47,5) karena itu memang basis pembayaran — hanya baris *deduksi berat* yang jadi gross.

**Effort:** Short+ — 2 baris rumus + 3 titik tampilan + 1 kartu & 1 panel restrukturisasi + update asersi test.
**Risk:** Low — rumus & field perLoad sudah diverifikasi; semua nilai tampilan hanya membaca dari `calc` (tidak menghitung ulang).

**Decisions to sanity-check (semua sudah dikonfirmasi user):**
- Netto sawit = 855 − 50 (kotor) = 805, bukan 855 − 47,5 (bersih) = 807,5.
- Baris deduksi SORTIRAN di nota layar & receipt thermal menampilkan berat KOTOR (−50 kg / −100 kg di fixture), supaya cocok dengan netto sawit.
- Output card per-muatan (Option A) + panel restrukturisasi berlabel (Option B) — user memilih keduanya.
- Bagian HARGA nota (pembayaran sortiran) TIDAK berubah — tetap net.

Your next move: jalankan `$start-work fix-sortiran-gross-weight`.

---

> TL;DR (machine): Short effort, low risk — ganti `- sortingNetWeight` → `- sortingWeight` di 2 file produksi + update 3 test files; tampilkan gross di baris deduksi nota/receipt (2 file + 1 test file); tambah output card per-muatan + restrukturisasi panel di Form.tsx; baterai penuh + build.

## Scope
### Must have
- Koreksi formula di `app/Models/WeighingTransaction.php:228` — ganti `- $sortingNetWeight` → `- $sortingWeight`.
- Koreksi mirror di `resources/js/lib/utils.ts:154` — ganti `- sortingNetWeight` → `- sortingWeight`.
- Update asersi test yang mengunci angka lama ke angka baru (3 file test).
- Nota layar `resources/js/pages/Weighing/Success.tsx` (baris per-muatan, line 167-180): deduksi SORTIRAN selalu tampilkan berat KOTOR.
- Receipt thermal `resources/js/lib/receipt-builder.ts` (line 111-125): deduksi SORTIRAN selalu tampilkan berat KOTOR.
- Update test `tests/JS/printer-service.test.ts:361` (rename + asersi −100 kg).
- **Option A**: kartu "Hasil Hitung" per-muatan di `resources/js/pages/Weighing/Form.tsx` (insert setelah input grid, sebelum tutup kartu muatan ~line 476-477).
- **Option B**: restrukturisasi panel "Kalkulasi Pembayaran" `Form.tsx` (line 694-904) jadi seksi HARGA / BERAT / NILAI / PEMBAYARAN dengan keterangan rumus.
- Baterai verifikasi penuh termasuk `npm run build`.

### Must NOT have (guardrails)
- TIDAK mengubah `sortingTotal = sortingNetWeight × sortingPricePerKg` — harga sortiran tetap pakai berat bersih.
- TIDAK mengubah guard `sorting_weight <= netto kotor` — tidak terpengaruh.
- TIDAK menyentuh `calculateTransaction` (dead code di utils.ts:229).
- TIDAK mengubah bagian HARGA nota `Success.tsx` (line 250-269: POTONGAN SORTIRAN −2,5 dan SORTIRAN (−47,5): Rp23.750) — pembayaran sortiran tetap berbasis net.
- TIDAK mengubah perhitungan di Form.tsx — kartu & panel hanya MENAMPILKAN nilai dari `calc` (perLoad), tidak menghitung ulang.
- TIDAK mengubah test yang `sorting_deduction_percentage = 0` atau `has_sorting = false` — angka tetap sama karena `sortingWeight == sortingNetWeight` dalam kasus tersebut.
- TIDAK mengubah layout lain di Form.tsx di luar kartu muatan & panel kanan.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test strategy: Tests-after — update asersi test yang ada ke angka baru; jalankan baterai penuh untuk pastikan tidak ada regresi.
- Untuk UI (Todo 4-5, tidak ada jsdom/RTL/testing-library): verifikasi via `npm run types:check` + `npm run lint` + `npm run build` + render ulang skenario user di F3 (cek nilai 805 / 1.633.750 muncul di kartu & panel).
- Evidence: `.omo/evidence/task-{1..6}-fix-sortiran-gross-weight.txt` + `.omo/evidence/final-f3-fix-sortiran-gross-weight.txt`.

## Execution strategy
### Parallel execution waves
- **Wave 1 (satu worker):** Todo 1 (PHP formula + test) dan Todo 2 (TS mirror + test) — sekuensial karena sangat kecil dan saling terkait konsepnya.
- **Wave 2:** Todo 3 — konsistensi nota/receipt (setelah 1+2 selesai, nilai gross sudah final).
- **Wave 3:** Todo 4 lalu Todo 5 — SEQUENTIAL (keduanya edit Form.tsx yang sama; jangan paralel di file yang sama).
- **Wave 4:** Todo 6 — baterai penuh setelah semua todo selesai.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | - | 3, 6 | - |
| 2 | - | 3, 4, 5, 6 | - |
| 3 | 1, 2 | 6 | - |
| 4 | 2 | 5, 6 | - |
| 5 | 2, 4 | 6 | - |
| 6 | 1, 2, 3, 4, 5 | - | - |

## Todos
- [x] 1. Koreksi formula PHP + update asersi test PHP
  What to do / Must NOT do:
  - **Rumus** (`app/Models/WeighingTransaction.php:228`): ganti `$net = $initial - $deductionWeight - $sortingNetWeight;` → `$net = $initial - $deductionWeight - $sortingWeight;`. Variable `$sortingWeight` sudah didefinisikan di baris 225 dan berisi berat KOTOR sortiran. Tidak perlu mengubah apapun selain `- $sortingNetWeight` → `- $sortingWeight`.
  - **Test** (`tests/Feature/WeighingTransactionTest.php:76-106`):
    - Rename test dari `'sorting net weight is deducted from netto before palm pricing'` → `'sorting weight is deducted from netto before palm pricing'`.
    - Update asersi:
      - Line 97: `net_weight` `'807.50'` → `'805.00'` (900 − 45 − 50 = 805)
      - Line 101: `palm_total_amount` `'1615000.00'` → `'1610000.00'` (805 × 2000)
      - Line 102: `gross_total_amount` `'1638750.00'` → `'1633750.00'` (1610000 + 23750)
      - Line 103: `final_paid_amount_rounded` `'1638750.00'` → `'1633750.00'`
      - Line 105: CashierCashEntry amount `'1638750.00'` → `'1633750.00'`
    - TIDAK berubah: `initial_weight` 900.00, `deduction_weight` 45.00, `sorting_deduction_weight` 2.50, `sorting_net_weight` 47.50, `sorting_total_amount` 23750.00.
  - TIDAK mengubah test lain. Multi-load test (line 38-74) tidak terpengaruh karena `sorting_deduction_percentage` tidak di-set (default 0 → `sortingWeight == sortingNetWeight`). Guard tests, draft tests, ReportsExportTest, DashboardTest semuanya tidak terpengaruh.

  Parallelization: Wave 1 | Blocked by: - | Blocks: 3
  References:
  - Rumus: `app/Models/WeighingTransaction.php:228`
  - Test: `tests/Feature/WeighingTransactionTest.php:76-106`
  - Fixture: `tests/Pest.php:48-63`
  - Hitung manual: netto kotor 900 − 45 = 855; 855 − 50 (kotor) = 805; palm = 805×2000 = 1.610.000; sortiran = 47,5×500 = 23.750; total = 1.633.750.
  Acceptance criteria: `php artisan test --compact --filter=WeighingTransactionTest` → semua hijau termasuk test regresi user scenario dengan angka baru.
  QA scenarios:
  - happy — jalankan acceptance command, capture ke `.omo/evidence/task-1-fix-sortiran-gross-weight.txt`.
  - failure — sebelum fix, test regresi merah (net 805 ≠ 807.50 yang diharapkan test lama); setelah fix → hijau.
  Commit: Y | fix(weighing): kurangi kolom sawit dengan berat kotor sortiran, bukan bersih

- [x] 2. Koreksi formula TS + update asersi test JS
  What to do / Must NOT do:
  - **Rumus** (`resources/js/lib/utils.ts:154`): ganti `const net = initial - deductionWeight - sortingNetWeight;` → `const net = initial - deductionWeight - sortingWeight;`. Variable `sortingWeight` sudah didefinisikan di baris 148.
  - **Test 1** (`tests/JS/utils.test.ts:84-100`, test `'applies sorting deduction percentage to sorting total'`):
    - Loads: gross 1000, tare 200, sorting 100 (ded 3%, palm 2580, sorting ded 5%, sorting price 500).
    - Update: line 96 `netWeight` 681 → **676** (800 − 24 − 100 = 676), line 97 `netWeight` 681 → **676**, line 98 `palmTotalAmount` 1756980 → **1744080** (676 × 2580), line 99 `grossTotalAmount` 1804480 → **1791580** (1744080 + 47500).
    - TIDAK berubah: `sortingDeductionWeight` 5, `sortingNetWeight` 95, `sortingTotalAmount` 47500 (lines 90-95).
  - **Test 2** (`tests/JS/utils.test.ts:121-146`, test `'subtracts sorting gross weight from net to calculate palm amount (user scenario)'`):
    - Rename test name dari `'subtracts sorting net weight from net to calculate palm amount (user scenario)'` → `'subtracts sorting gross weight from net to calculate palm amount (user scenario)'`.
    - Update comment di lines 139-140: ganti `// gross 1000 - tare 100 = 900; 5% deduction = 45; net = 900 - 45 = 855` → `// gross 1000 - tare 100 = 900; 5% deduction = 45; netto bersih = 900 - 45 = 855` dan `// sorting: 50 - 5% = 47.5 net; net toto = 855 - 47.5 = 807.5` → `// sortiran: 50 gross, 5% potongan → 47.5 net; kolom sawit = 855 - 50 = 805`.
    - Update asersi: line 141 `netWeight` 807.5 → **805** (900 − 45 − 50), line 144 `palmTotalAmount` 1615000 → **1610000** (805 × 2000), line 145 `grossTotalAmount` 1638750 → **1633750** (1610000 + 23750).
    - TIDAK berubah: `sortingNetWeight` 47.5, `sortingTotalAmount` 23750 (lines 142-143).
  - TIDAK berubah: `weighing-form.test.ts` (fixture statis, tidak menghitung via calculateLoads), test `'keeps legacy behavior'` dan `'defaults to zero'` (sorting ded = 0 → angka sama).
  - TIDAK mengubah `calculateTransaction` (dead code :229).
  - CATATAN: `printer-service.test.ts` fixture statis (tidak via calculateLoads) — tidak terpengaruh Todo 2; diubah di Todo 3.

  Parallelization: Wave 1 | Blocked by: - | Blocks: 3
  References:
  - Rumus: `resources/js/lib/utils.ts:148-154`
  - Test 1: `tests/JS/utils.test.ts:84-100`
  - Test 2: `tests/JS/utils.test.ts:121-146`
  - Hitung manual: 800 − 24 − 100 = 676; 676 × 2580 = 1.744.080; + 47.500 = 1.791.580.
  Acceptance criteria: `npm run test:js -- tests/JS/utils.test.ts` → hijau semua.
  QA scenarios:
  - happy — jalankan acceptance command, capture ke `.omo/evidence/task-2-fix-sortiran-gross-weight.txt`.
  - failure — sebelum fix, test 1 merah (net 676 ≠ 681) dan test 2 merah (net 805 ≠ 807.5); setelah fix → hijau.
  Commit: Y | fix(weighing): sinkronkan rumus sortiran gross weight ke preview TS

- [x] 3. Nota layar & receipt thermal: baris deduksi SORTIRAN tampilkan berat KOTOR + update test
  What to do / Must NOT do:
  - **`resources/js/pages/Weighing/Success.tsx` line 167-180** (baris per-muatan): value saat ini `-${formatKg(pct > 0 ? load.sorting_net_weight : load.sorting_weight)}` → ganti jadi SELALU `-${formatKg(load.sorting_weight)}` (berat kotor). Label `SORTIRAN ${pct}%:` / `SORTIRAN:` TETAP (pct hanya untuk label, bukan untuk memilih nilai). Hasil skenario user: `SORTIRAN 5%: -50 kg` lalu `NETTO: 805 kg` — aritmetika 855 − 50 = 805 ✓ (dengan POTONGAN −45 di baris transaksi).
  - **`resources/js/lib/receipt-builder.ts` line 111-125**: ganti `const sortingWeight = pct > 0 ? load.sorting_net_weight : load.sorting_weight;` → `const sortingWeight = load.sorting_weight;`. Suffix `(pct%)` TETAP ditampilkan saat pct > 0. Hasil: `#1 SORTIRAN: -100 kg (5%)` pada fixture.
  - **`tests/JS/printer-service.test.ts:361`**: rename `'should include net sorting weight on SORTIRAN line'` → `'should include gross sorting weight on SORTIRAN line'`; ubah asersi line 393 `toContain('-95 kg')` → `toContain('-100 kg')`. Fixture sudah benar: `sorting_weight: 100`, `sorting_net_weight: 95`, `sorting_deduction_percentage: 5` (default createSampleTransaction, line 102).
  - TIDAK mengubah bagian HARGA nota `Success.tsx` line 250-269 (POTONGAN SORTIRAN −2,5 dan SORTIRAN (−47,5): Rp23.750 tetap net — basis pembayaran).
  - TIDAK mengubah non-loads branch receipt (line 139-157) dan TIDAK menambah baris baru di receipt pada 32 kolom (line length guard sudah ada — baris baru harus lulus test `overlong`).
  - Jika ada test JS lain yang mengunci baris SORTIRAN nota (mis. ke depan), update sesuai gross; baterai penuh akan menangkapnya.

  Parallelization: Wave 2 | Blocked by: 1, 2 | Blocks: 6
  References:
  - Nota: `resources/js/pages/Weighing/Success.tsx:167-180` (weights) — jangan sentuh `:250-269` (prices)
  - Receipt: `resources/js/lib/receipt-builder.ts:111-125`
  - Test: `tests/JS/printer-service.test.ts:361-394`
  Acceptance criteria: `npm run test:js -- tests/JS/printer-service.test.ts` → hijau; nota render menampilkan `-50 kg` (gross) pada SORTIRAN di seksi berat.
  QA scenarios:
  - happy — jalankan acceptance command, capture ke `.omo/evidence/task-3-fix-sortiran-gross-weight.txt`; render Success.tsx (via build) tampilkan `SORTIRAN 5%: -50 kg`, `NETTO: 805 kg`.
  - failure — test `should include net sorting weight...` merah karena asersi `-95 kg` gagal (`-100 kg` yang tampil); setelah update → hijau.
  Commit: Y | fix(weighing): tampilkan berat kotor sortiran di nota dan receipt

- [x] 4. Option A — kartu "Hasil Hitung" per-muatan di Form.tsx
  What to do / Must NOT do:
  - Tempat: di dalam tiap kartu muatan `resources/js/pages/Weighing/Form.tsx`, setelah tutup `grid grid-cols-1 gap-3 md:grid-cols-4` (line 476) dan SEBELUM tutup kartu (line 477). Blok read-only — TIDAK ada input baru, TIDAK menghitung ulang; baca saja dari `perLoad` (`calc.perLoad[i]`) dan `data`.
  - Struktur (ikuti gaya mono panel kanan; border-t dashed seperti nota; text-xs; `bg-muted/30` opsional):
    - Heading kecil: `Hasil Hitung` — gunakan elemen `<p>` dengan class `text-[10px] font-bold tracking-widest text-muted-foreground uppercase` (konsisten dengan heading kartu lain) + `border-t border-dashed pt-2 mt-3`.
    - Baris (flex justify-between, label italic muted kiri / nilai mono kanan), urutan:
      1. `Netto Kotor` → `formatKgTrimmed(perLoad.initialWeight)` — caption opsional `Bruto − Tara`
      2. `Potongan {data.deduction_percentage}%` (merah, `text-red-500`, nilai `-formatKgTrimmed(perLoad.deductionWeight)`) — hanya jika `data.has_deduction`
      3. `Sortiran (gross)` (merah, nilai `-formatKgTrimmed(perLoad.sortingWeight)`) — hanya jika `perLoad.hasSorting` — plus caption `dikeluarkan dari kolom sawit`
      4. `Netto` (hijau emerald, bold, nilai `formatKgTrimmed(perLoad.netWeight)`) — caption `dasar harga sawit`
      5. `+ Sortiran` (hijau, nilai `+formatRupiah(perLoad.sortingTotalAmount)`) — hanya jika `perLoad.hasSorting` — caption `net × harga sortiran`
      6. `Nilai Muatan` (bold, `border-t border-dashed pt-1`, nilai `formatRupiah(perLoad.netWeight * data.palm_price_per_kg + perLoad.sortingTotalAmount)`) — fórmula SAMA dengan panel kanan line 720-722.
  - Warna konsisten dengan panel kanan: merah = minus, emerald = plus, teks utama = muted/foreground.
  - TIDAK mengubah struktur kartu lain, TIDAK mengubah `NumberInput`, TIDAK menambah state/useMemo baru (cukup render `calc.perLoad[i]` yang sudah ada di closure line 357).
  - TIDAK mengubah perhitungan — hanya presentasi.

  Parallelization: Wave 3 | Blocked by: 2 | Blocks: 5
  References:
  - Insert point: `resources/js/pages/Weighing/Form.tsx:476-477`
  - Data: `calc.perLoad` (utils.ts:159-172 — field lengkap: grossWeight, tareWeight, initialWeight, deductionWeight, netWeight, hasSorting, sortingWeight, sortingDeductionWeight, sortingNetWeight, sortingTotalAmount)
  - Rumus nilai muatan (salin persis): `pl.netWeight * data.palm_price_per_kg + pl.sortingTotalAmount` (Form.tsx:720-722)
  Acceptance criteria: `npm run types:check` hijau; `npm run build` sukses; pada render skenario user kartu muatan #1 menampilkan `Netto 805 kg` dan `Nilai Muatan Rp 1.633.750`.
  QA scenarios:
  - happy — build + types hijau; F3 render menunjukkan kartu output dengan 805 / 1.633.750.
  - failure — TS error (mis. field salah) atau build gagal → perbaiki referensi field dari PerLoadCalculation.
  Commit: Y | feat(weighing): tambah kartu hasil hitung per muatan di input timbangan

- [x] 5. Option B — restrukturisasi panel "Kalkulasi Pembayaran" jadi seksi berlabel + keterangan rumus
  What to do / Must NOT do:
  - Lingkup: blok `resources/js/pages/Weighing/Form.tsx` line 704-842 (isi `space-y-3 p-5 font-mono text-sm`). Header panel (696-702), tombol, error block (857-873) TIDAK berubah. Total Kotor (800-807) dan Final block (822-842) DIPERTAHANKAN posisinya (Total Kotor di akhir seksi NILAI; Final block tetap di bawah).
  - Struktur baru — 4 seksi, tiap seksi diawali heading `text-[10px] font-bold tracking-widest text-muted-foreground uppercase` + `border-b border-sidebar-border/30 pb-1`:
    - **HARGA**:
      - `Harga Sawit` → `formatRupiah(data.palm_price_per_kg)` + caption `/kg`
      - `Harga Sortiran` → `formatRupiah(data.sorting_price_per_kg)` + caption `/kg` — hanya jika `calc.hasSorting` (data.sorting_price_per_kg selalu ada, lihat Form.tsx:144)
    - **BERAT**:
      - per-muatan (line 706-727 saat ini, dipertahankan): `Muatan #N (netto)` → nilai rupiah per muatan (`netWeight × palm + sortingTotalAmount`) — biarkan seperti sekarang, tambahkan caption `netto sawit` di label.
      - `Netto Kotor (total)` → `formatKgTrimmed(calc.initialWeight)` + caption `Σ Bruto − Tara` (line 728-737)
      - `Potongan {data.deduction_percentage}%` merah → `-formatKgTrimmed(calc.deductionWeight)` — hanya jika `data.has_deduction` (line 738-751)
      - **BARU**: `Sortiran (gross)` merah → `-formatKgTrimmed(calc.sortingWeight)` — hanya jika `calc.hasSorting` — caption `dikeluarkan dari kolom sawit` → membuat aritmetika 855 − 45 − 50 = 805 terlihat eksplisit di panel
      - `Netto Bersih` hijau/bold → `formatKgTrimmed(calc.netWeight)` + caption `dasar harga sawit` (line 752-759)
    - **NILAI**:
      - `Total Sawit` bold → `formatRupiah(calc.palmTotalAmount)` + caption `netto bersih × harga sawit` (line 760-767)
      - `Potongan Sortiran {pct}%` merah → `-formatKgTrimmed(calc.sortingDeductionWeight)` — hanya jika `calc.hasSorting && pct > 0` (line 768-786) + caption `potongan mutu sortiran` (tetap NET — basis pembayaran)
      - `Total Sortiran` hijau → `+formatRupiah(calc.sortingTotalAmount)` — hanya jika `calc.hasSorting` (line 787-799) + caption `net sortiran × harga sortiran`
      - `Total Kotor` (bar bg-muted/40, bold — line 800-807) — dipertahankan sebagai penutup seksi NILAI
    - **PEMBAYARAN** (seksi opsional — render hanya jika relevan):
      - `Bayar Hutang` merah → `-formatRupiah(data.debt_paid_amount)` — hanya jika `data.debt_paid_amount > 0` (line 808-820)
      - Final block `Total Diterima Petani` (823-842) — dipertahankan, caption rounding tidak berubah
      - `Sisa Hutang Petani` merah — hanya jika `data.debt_paid_amount > 0` (line 844-855)
  - Gaya caption: `<span className="block text-[10px] italic text-muted-foreground/70">` di bawah/samping label, atau cukup perluas label dengan teks deskriptif — pilih satu gaya yang konsisten di semua seksi (jangan campur).
  - TIDAK mengubah data flow/state/useForm; hanya JSX panel. TIDAK menambah komponen baru di luar Form.tsx kecuali inline. TIDAK mengubah tombol/error block.
  - Pastikan semua nilai tetap dibaca dari `calc`/`data` — TIDAK menghitung ulang di JSX (kecuali rumus per-muatan yang memang inline sama seperti saat ini).

  Parallelization: Wave 3 | Blocked by: 2, 4 | Blocks: 6
  References:
  - Panel: `resources/js/pages/Weighing/Form.tsx:694-904` (fokus 704-855)
  - Field calc tersedia: `calc.initialWeight, deductionWeight, netWeight, palmTotalAmount, sortingWeight, sortingDeductionWeight, sortingTotalAmount, grossTotalAmount, finalPaidAmount, finalPaidAmountRounded, remainingDebtAmount, hasSorting, perLoad[]` (utils.ts:175+)
  - Field data tersedia: `data.palm_price_per_kg, data.sorting_price_per_kg, data.deduction_percentage, data.sorting_deduction_percentage, data.has_deduction, data.debt_paid_amount`
  Acceptance criteria: `npm run types:check` + `npm run lint` + `npm run build` hijau; render skenario user menampilkan seksi HARGA/BERAT/NILAI/PEMBAYARAN dengan `Sortiran (gross) -50`, `Netto Bersih 805`, `Total Sawit 1.610.000`, `Total Kotor 1.633.750`, `Total Diterima 1.633.750`.
  QA scenarios:
  - happy — build/lint/types hijau; F3 render cek keempat seksi + angka skenario user.
  - failure — lint/TS error dari struktur JSX baru → perbaiki; angka salah → pastikan hanya membaca dari `calc` (jangan hitung ulang di JSX).
  Commit: Y | feat(weighing): restrukturisasi panel kalkulasi pembayaran dengan seksi berlabel

- [x] 6. Baterai verifikasi penuh (backend + JS + format + lint + types + build)
  What to do / Must NOT do:
  Jalankan seluruh gate secara berurutan:
  1. `composer test` — suite penuh backend.
  2. `npm run test:js` — seluruh vitest (termasuk printer-service.test.ts yang diubah di Todo 3).
  3. `vendor/bin/pint --dirty --format agent` — format PHP yang berubah.
  4. `npm run format && npm run lint && npm run types:check` — format + lint + type check JS/TS.
  5. `npm run build` — produksi build (memvalidasi JSX baru + nota).
  JANGAN perbaiki kegagalan di luar scope — jika test lain merah, STOP dan laporkan.
  JANGAN hapus test tanpa approval.

  Parallelization: Wave 4 | Blocked by: 1, 2, 3, 4, 5 | Blocks: -
  References: AGENTS.md perintah utama; package.json scripts; vitest.config.ts (tests/JS/**/*.test.ts, tanpa jsdom/RTL → verifikasi UI lewat build+types+smoke).
  Acceptance criteria: kelima gate hijau tanpa error; output di `.omo/evidence/task-6-fix-sortiran-gross-weight.txt`.
  QA scenarios:
  - happy — kelima command exit 0.
  - failure — identifikasi test merah; pastikan apakah karena angka sortiran (update asersi) atau penyebab lain (jangan asal ubah).
  Commit: N (tidak ada perubahan kode; hanya verifikasi)

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — bandingkan hasil akhir vs daftar todo: setiap acceptance criteria terpenuhi; angka skenario user: netto sawit 805, palm 1.610.000, sortiran 23.750, total 1.633.750; nota/receipt menampilkan gross (−50/−100 kg).
- [x] F2. Code quality review — diff hanya menyentuh: WeighingTransaction.php:228 (satu variabel), utils.ts:154 (satu variabel), WeighingTransactionTest.php, utils.test.ts, Success.tsx (baris 167-180 saja), receipt-builder.ts (line 113-114 saja), printer-service.test.ts (test 361), Form.tsx (kartu muatan + panel kanan). Tidak ada file lain berubah.
- [x] F3. Skenario user smoke test — jalankan ulang skenario user (1000/100, potongan 5%, harga 2000, sortiran 50 @5% harga 500) → 805.00 / 1610000.00 / 23750.00 / 1633750.00; PLUS render halaman input: kartu "Hasil Hitung" muatan #1 menampilkan `Netto 805` & `Nilai Muatan Rp 1.633.750`; panel menampilkan 4 seksi dengan `Sortiran (gross) -50`, `Netto Bersih 805`, `Total Kotor 1.633.750`. Capture ke `.omo/evidence/final-f3-fix-sortiran-gross-weight.txt`.
- [x] F4. Scope fidelity — tidak ada backfill, tidak ada perubahan API/skema/dead code, guard tetap; bagian HARGA nota (pembayaran sortiran) TIDAK berubah (tetap net 47,5 → 23.750); test dengan sorting_deduction_percentage = 0 atau has_sorting = false TIDAK berubah (regresi nol).

## Commit strategy
- Todo 1: `fix(weighing): kurangi kolom sawit dengan berat kotor sortiran, bukan bersih`
- Todo 2: `fix(weighing): sinkronkan rumus sortiran gross weight ke preview TS`
- Todo 3: `fix(weighing): tampilkan berat kotor sortiran di nota dan receipt`
- Todo 4: `feat(weighing): tambah kartu hasil hitung per muatan di input timbangan`
- Todo 5: `feat(weighing): restrukturisasi panel kalkulasi pembayaran dengan seksi berlabel`
- Todo 6: tidak commit (verifikasi saja).
- Branch: current branch (Fix-Security).
- Jangan squash; jangan commit `.omo/` artifacts.

## Success criteria
- Skenario user: 855 − 50 = 805 kg → palm = 805 × 2000 = Rp 1.610.000 + sortiran 47,5 × 500 = Rp 23.750 → **Rp 1.633.750** ✓
- Nota layar & receipt thermal: baris deduksi SORTIRAN menampilkan berat KOTOR (−50 kg / −100 kg) sehingga aritmetika cocok dengan netto sawit; bagian pembayaran sortiran tetap net ✓
- Halaman input: kartu "Hasil Hitung" per-muatan (Option A) + panel 4 seksi berlabel dengan keterangan rumus (Option B) menampilkan angka yang sama dengan perhitungan ✓
- Tanpa sortiran: angka IDENTIK dengan sebelumnya (sortingWeight = 0, tidak ada perubahan) ✓
- Dengan sortiran, sorting_deduction_percentage = 0: angka IDENTIK (sortingWeight == sortingNetWeight) ✓
- Guard tetap aktif dan berfungsi ✓
- PHP mirror = TS mirror ✓
- `composer test` + `npm run test:js` + pint + lint + types:check + `npm run build` semuanya hijau ✓