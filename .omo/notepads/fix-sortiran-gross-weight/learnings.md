
## Todo 1 — Koreksi formula PHP (commit 31d46c1)

- `WeighingTransaction::calculateLoads()` line 228: `$net = $initial - $deductionWeight - $sortingNetWeight` → `$sortingWeight`.
- Alasan: kolom sawit (netto) harus dikurangi berat KOTOR sortiran (50 kg), bukan berat bersih sortiran (47,5 kg). Berat bersih sortiran tetap dipakai untuk harga sortiran (`sortingTotal = sortingNetWeight × sortingPricePerKg`) — itu TIDAK berubah.
- Angka baru yang benar (supersede plan lama `fix-sortiran-netto-calculation` yang mengunci 807.5/1.638.750):
  - initial 900 − deduction 45 − sorting kotor 50 = net 805
  - palm = 805 × 2000 = 1.610.000
  - sortiran = 47,5 × 500 = 23.750
  - total = 1.633.750
- Test `sorting weight is deducted from netto before palm pricing` diupdate: net_weight 805.00, palm_total_amount 1610000.00, gross_total_amount 1633750.00, final_paid_amount_rounded 1633750.00, CashierCashEntry 1633750.00.
- `php artisan test --compact --filter=WeighingTransactionTest` → 26 passed, 198 assertions.
- Catatan: `resources/js/lib/utils.ts` sudah punya fix yang sama (net = initial − deduction − sortingWeight) dari commit `8dec094` — Todo 2 tinggal sinkronisasi/verifikasi sisi TS.

## Todo 2 — Koreksi formula TS + update asersi test JS

- `resources/js/lib/utils.ts:154`: `const net = initial - deductionWeight - sortingNetWeight` → `const net = initial - deductionWeight - sortingWeight`. Hanya satu variabel berubah; `sortingNetWeight` (baris 153) tetap dipakai untuk `sortingTotal` (harga sortiran) — TIDAK dihapus.
- Catatan: notepad Todo 1 mengklaim utils.ts "sudah punya fix yang sama dari commit 8dec094" — itu SALAH. Saat dibaca, baris 154 masih `sortingNetWeight` (formula lama). Fix TS memang belum pernah diterapkan; Todo 2 ini yang menerapkannya.
- Test 1 (`applies sorting deduction percentage to sorting total`): net 681 → 676, palmTotalAmount 1756980 → 1744080, grossTotalAmount 1804480 → 1791580. sortingDeductionWeight 5 / sortingNetWeight 95 / sortingTotalAmount 47500 TIDAK berubah.
  - Verifikasi manual: 800 − 24 − 100 = 676; 676 × 2580 = 1.744.080; + 47.500 = 1.791.580.
- Test 2 (`subtracts sorting gross weight from net...`): rename dari "net weight", comment diupdate (netto bersih / kolom sawit = 855 − 50 = 805), net 807.5 → 805, palmTotalAmount 1615000 → 1610000, grossTotalAmount 1638750 → 1633750. sortingNetWeight 47.5 / sortingTotalAmount 23750 TIDAK berubah.
  - Verifikasi manual: 900 − 45 − 50 = 805; 805 × 2000 = 1.610.000; + 23.750 = 1.633.750.
- `npm run test:js -- tests/JS/utils.test.ts` → 13 passed (1 file). Evidence: `.omo/evidence/task-2-fix-sortiran-gross-weight.txt`.
- Test `keeps legacy behavior` dan `defaults to zero` TIDAK disentuh (sorting ded = 0 → sortingNetWeight == sortingWeight → angka sama).

## Todo 3 — Nota layar & receipt thermal: berat KOTOR sortiran (commit 9699260)

- `resources/js/pages/Weighing/Success.tsx` (baris per-muatan, ~174-178): value `-${formatKg(pct > 0 ? load.sorting_net_weight : load.sorting_weight)}` → `-${formatKg(load.sorting_weight)}`. Label `SORTIRAN ${pct}%:` / `SORTIRAN:` TETAP — pct hanya untuk label, bukan pemilih nilai. Hasil skenario user: `SORTIRAN 5%: -50 kg` lalu `NETTO: 805 kg`.
- `resources/js/lib/receipt-builder.ts` (line 113-114): `const sortingWeight = pct > 0 ? load.sorting_net_weight : load.sorting_weight;` → `const sortingWeight = load.sorting_weight;`. Suffix `(pct%)` TETAP (line 120) saat pct > 0. Hasil fixture: `#1 SORTIRAN: -100 kg (5%)`.
- `tests/JS/printer-service.test.ts:361`: test rename `'should include net sorting weight on SORTIRAN line'` → `'should include gross sorting weight on SORTIRAN line'`; asersi `toContain('-95 kg')` → `toContain('-100 kg')`. Fixture sudah benar (sorting_weight 100, sorting_net_weight 95, sorting_deduction_percentage 5).
- `npm run test:js -- tests/JS/printer-service.test.ts` → 56 passed (1 file). Evidence: `.omo/evidence/task-3-fix-sortiran-gross-weight.txt`.
- TIDAK disentuh: bagian HARGA nota Success.tsx line 250-269 (POTONGAN SORTIRAN −2,5 & SORTIRAN (−47,5): Rp23.750 tetap net — basis pembayaran), non-loads branch receipt (line 139-157), test lain, file PHP.
- Catatan: LSP di printer-service.test.ts melaporkan `Cannot find module '@/...'` — pre-existing alias resolution issue, bukan dari perubahan ini (import tidak disentuh).

## Todo 4 — Kartu "Hasil Hitung" per-muatan di Form.tsx

- `resources/js/pages/Weighing/Form.tsx`: blok read-only `Hasil Hitung` disisipkan di dalam tiap kartu muatan, setelah tutup grid `grid grid-cols-1 gap-3 md:grid-cols-4` (baris 477) dan sebelum tutup kartu (baris 478). Tidak ada input/state/useMemo baru — hanya render `perLoad` (closure `calc.perLoad[i]`, baris 357) dan `data`.
- Struktur: container `mt-3 border-t border-dashed pt-2`; heading `text-[10px] font-bold tracking-widest text-muted-foreground uppercase`; isi `mt-2 space-y-1 font-mono text-xs` (mono mengikuti panel kanan).
- 6 baris (flex justify-between, label italic muted kiri / nilai mono kanan):
  1. `Netto Kotor` → `formatKgTrimmed(perLoad.initialWeight)` — caption `Bruto − Tara`
  2. `Potongan {data.deduction_percentage}%` (text-red-500, `-formatKgTrimmed(perLoad.deductionWeight)`) — hanya jika `data.has_deduction`
  3. `Sortiran (gross)` (text-red-500, `-formatKgTrimmed(perLoad.sortingWeight)`) — hanya jika `perLoad.hasSorting` — caption `dikeluarkan dari kolom sawit`
  4. `Netto` (text-emerald-600 bold, `formatKgTrimmed(perLoad.netWeight)`) — caption `dasar harga sawit`
  5. `+ Sortiran` (text-emerald-600, `+formatRupiah(perLoad.sortingTotalAmount)`) — hanya jika `perLoad.hasSorting` — caption `net × harga sortiran`
  6. `Nilai Muatan` (bold, `border-t border-dashed pt-1`, `formatRupiah(perLoad.netWeight * data.palm_price_per_kg + perLoad.sortingTotalAmount)`) — fórmula identik panel kanan baris 720-722.
- Caption dirender sebagai `<span className="block text-[10px] text-muted-foreground/60 not-italic">` di bawah label (bukan inline) supaya kolom nilai tetap bersih.
- Null-safety mengikuti pola existing: `perLoad?.field ?? 0` (sama seperti header kartu baris 372-375).
- Verifikasi: `npm run format` (Form.tsx di-rewrite prettier), `npm run lint` EXIT 0, `npm run types:check` EXIT 0, `npm run build` EXIT 0 (vite 26.43s). Evidence: `.omo/evidence/task-4-fix-sortiran-gross-weight.txt`.
- TIDAK disentuh: panel kanan "Kalkulasi Pembayaran" (Todo 5), NumberInput, perhitungan, file lain.

## Todo 5 — Restrukturisasi panel "Kalkulasi Pembayaran" jadi 4 seksi berlabel (commit TBD)

- `resources/js/pages/Weighing/Form.tsx`: isi panel kanan (container `space-y-3 p-5 font-mono text-sm`, baris 814) direstrukturisasi jadi 4 seksi berlabel. Header panel, tombol, error block TIDAK berubah.
- Heading seksi: `border-b border-sidebar-border/30 pb-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase`. Caption konsisten: `<span className="block text-[10px] text-muted-foreground/70 italic">` di bawah label (prettier mengurutkan class — sama saja).
- **HARGA**: `Harga Sawit` → `formatRupiah(data.palm_price_per_kg)` + caption `/kg`; `Harga Sortiran` → `formatRupiah(data.sorting_price_per_kg)` + caption `/kg` — hanya jika `calc.hasSorting`.
- **BERAT**: per-muatan (dipertahankan, label + caption `netto sawit`); `Netto Kotor (total)` + caption `Σ Bruto − Tara`; `Potongan {pct}%` merah (jika `data.has_deduction`); **BARU** `Sortiran (gross)` merah → `-formatKgTrimmed(calc.sortingWeight)` + caption `dikeluarkan dari kolom sawit` (jika `calc.hasSorting`); `Netto Bersih` emerald + caption `dasar harga sawit`.
- **NILAI**: `Total Sawit` + caption `netto bersih × harga sawit`; `Potongan Sortiran {pct}%` merah + caption `potongan mutu sortiran` (jika `calc.hasSorting && pct > 0`, tetap NET — basis pembayaran); `Total Sortiran` emerald + caption `net sortiran × harga sortiran` (jika `calc.hasSorting`); `Total Kotor` (bar bg-muted/40) sebagai penutup seksi.
- **PEMBAYARAN** (opsional, render hanya jika `data.debt_paid_amount > 0`): heading + `Bayar Hutang` merah. Final block `Total Diterima Petani` TETAP di bawah (selalu render, caption rounding tidak berubah); `Sisa Hutang Petani` merah di bawah final block (jika debt > 0).
- Semua nilai dibaca dari `calc`/`data` — tidak ada perhitungan ulang di JSX kecuali rumus per-muatan inline yang memang sudah ada (`pl.netWeight * data.palm_price_per_kg + pl.sortingTotalAmount`).
- Verifikasi: `npm run format` (Form.tsx di-rewrite prettier), `npm run lint` EXIT 0, `npm run types:check` EXIT 0, `npm run build` EXIT 0 (vite 24.37s). Evidence: `.omo/evidence/task-5-fix-sortiran-gross-weight.txt`.
- TIDAK disentuh: kartu "Hasil Hitung" per-muatan (Todo 4), NumberInput, data flow/state, file lain.

## F1 — Plan compliance audit (VERDICT: APPROVE)

- Audit read-only 2026-09-14. Semua 6 todo + acceptance criteria terpenuhi. Tidak ada file diubah.
- **Todo 1** ✅ `WeighingTransaction.php:228` = `$net = $initial - $deductionWeight - $sortingWeight;` (gross). Test rename `'sorting weight is deducted from netto before palm pricing'`; asersi net 805.00 / palm 1610000.00 / gross 1633750.00 / final 1633750.00 / CashierCashEntry 1633750.00; yang TIDAK berubah tetap: initial 900.00, deduction 45.00, sorting_deduction_weight 2.50, sorting_net_weight 47.50, sorting_total_amount 23750.00. Acceptance: `php artisan test --compact --filter=WeighingTransactionTest` → 26 passed, 198 assertions (dijalankan ulang saat audit).
- **Todo 2** ✅ `utils.ts:154` = `const net = initial - deductionWeight - sortingWeight;` (gross). Test 1: net 676 / palm 1744080 / gross 1791580; sortingDeductionWeight 5 / sortingNetWeight 95 / sortingTotalAmount 47500 tetap. Test 2 rename `'subtracts sorting gross weight from net...'`, komentar diupdate, net 805 / sortingNetWeight 47.5 / sortingTotalAmount 23750 / palm 1610000 / gross 1633750. Acceptance: `npm run test:js -- tests/JS/utils.test.ts` → 13 passed (dijalankan ulang).
- **Todo 3** ✅ `Success.tsx:174` value SELALU `-${formatKg(load.sorting_weight)}` (gross); label `SORTIRAN ${pct}%:` / `SORTIRAN:` tetap. `receipt-builder.ts:113` = `const sortingWeight = load.sorting_weight;`; suffix `(pct%)` tetap. `printer-service.test.ts:361` rename `'should include gross sorting weight on SORTIRAN line'` + asersi `toContain('-100 kg')`. Bagian HARGA nota (250-265) tetap net (POTONGAN SORTIRAN −2,5 & SORTIRAN (−47,5): Rp23.750). Acceptance: `npm run test:js -- tests/JS/printer-service.test.ts` → 56 passed (dijalankan ulang).
- **Todo 4** ✅ Kartu "Hasil Hitung" per-muatan Form.tsx:479-587 (setelah grid, sebelum tutup kartu). 6 baris lengkap: Netto Kotor (Bruto − Tara), Potongan {pct}% (jika has_deduction), Sortiran (gross) (jika hasSorting, caption "dikeluarkan dari kolom sawit"), Netto (dasar harga sawit), + Sortiran (net × harga sortiran), Nilai Muatan (border-t dashed, rumus identik panel kanan). Read-only, null-safe `perLoad?.field ?? 0`.
- **Todo 5** ✅ Panel Form.tsx:814-1059 jadi 4 seksi berheading `border-b border-sidebar-border/30 pb-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase`: HARGA (Harga Sawit/Sortiran + /kg), BERAT (per-muatan + Netto Kotor (total) Σ Bruto − Tara + Potongan + Sortiran (gross) −calc.sortingWeight + Netto Bersih), NILAI (Total Sawit + Potongan Sortiran + Total Sortiran + Total Kotor bg-muted/40), PEMBAYARAN (opsional jika debt>0: Bayar Hutang; Final block Total Diterima Petani tetap; Sisa Hutang Petani). Semua baca dari calc/data, tidak hitung ulang.
- **Todo 6** ✅ Evidence `task-6-fix-sortiran-gross-weight.txt`: composer test 127 passed/672 assertions, test:js 87 passed, pint passed, format+lint+types clean, build 23.30s.
- **Angka skenario user** ✅ 900 − 45 − 50 = 805; 805 × 2000 = 1.610.000; 47,5 × 500 = 23.750; total 1.633.750. Semua muncul di test PHP + TS.
- **Nota/receipt gross** ✅ Success.tsx render `-50 kg` (sorting_weight 50); fixture receipt `-100 kg` (sorting_weight 100).
- **Commit** ✅ 31d46c1 (T1), d5d5b5b (T2), 9699260 (T3), 1aad89d (T4), d2504dc (T5) — semua ada di git log. Todo 6 tanpa commit (verifikasi saja) sesuai plan.
- Catatan kecil (bukan blocker): heading seksi panel memakai teks title-case (`Harga`/`Berat`/`Nilai`/`Pembayaran`) dengan class `uppercase` — render visual tetap HARGA/BERAT/NILAI/PEMBAYARAN, sesuai acceptance criteria.

## F4 — Scope fidelity review (read-only, base 8dec094..HEAD)

VERDICT: **APPROVE** — semua guardrail plan terpenuhi, tidak ada scope creep.

### Guardrail 1: sortingTotal tetap net ✅
- `WeighingTransaction.php:229` `$sortingTotal = $loadHasSorting ? $sortingNetWeight * $sortingPricePerKg : 0;` — TIDAK berubah (diff hanya menyentuh baris 228).
- `utils.ts:155-157` `const sortingTotal = loadHasSorting ? sortingNetWeight * sortingPricePerKg : 0;` — TIDAK berubah (diff hanya menyentuh baris 154).

### Guardrail 2: guard sorting_weight <= netto kotor tetap ✅
- `WeighingTransactionController.php` TIDAK ada di diff (0 perubahan controller).
- Guard finalize (line 272): `if ($load->has_sorting && $load->sorting_weight > $load->gross_weight - $load->tare_weight)` — utuh.
- Guard store/update via `loadsError` (line 410): `if ($load['has_sorting'] && $load['sorting_weight'] > $load['gross_weight'] - $load['tare_weight'])` — utuh.
- Rule validasi (line 367): `'loads.*.sorting_weight' => 'nullable|numeric|min:0'` — utuh.

### Guardrail 3: dead code calculateTransaction tidak disentuh ✅
- `utils.ts:229` `calculateTransaction` — utuh (diff utils.ts hanya baris 154).

### Guardrail 4: bagian HARGA nota Success.tsx 250-269 tetap net ✅
- Diff Success.tsx hanya menyentuh baris per-muatan 171-177 (value `-${formatKg(load.sorting_weight)}`).
- Baris 250-265 (POTONGAN SORTIRAN −2,5 & SORTIRAN (−47,5): Rp23.750) — utuh, masih pakai `sorting_deduction_weight` / `sorting_net_weight` / `sorting_total_amount`.

### Guardrail 5: test sorting_deduction_percentage=0 / has_sorting=false tidak berubah ✅
- `utils.test.ts` 'keeps legacy behavior' (102-111) — utuh (sortingDeductionWeight 0, sortingNetWeight 100, sortingTotalAmount 50000).
- `utils.test.ts` 'defaults to zero' (113-119) — utuh.
- Multi-load test PHP `WeighingTransactionTest` 38-74 — utuh (net_weight 1356.50, sorting_total 25000.00, dst; sorting_deduction_percentage default 0 → sortingWeight == sortingNetWeight).

### Guardrail 6: tidak ada API/skema/migration/route ✅
- `git diff 8dec094..HEAD --name-only` = 8 file saja: WeighingTransaction.php, receipt-builder.ts, utils.ts, Form.tsx, Success.tsx, WeighingTransactionTest.php, printer-service.test.ts, utils.test.ts.
- Tidak ada routes/migrations/schema/database/seed.

### Guardrail 7: tidak ada backfill ✅
- Tidak ada data migration, seeder, atau script backfill di diff.

### Verifikasi tambahan
- Form.tsx: hanya presentasi (kartu Hasil Hitung + panel 4 seksi). Semua nilai dibaca dari `calc`/`perLoad`; satu-satunya aritmetika adalah rumus nilai muatan per-muatan yang IDENTIK dengan panel kanan: kartu `(perLoad?.netWeight ?? 0) * data.palm_price_per_kg + (perLoad?.sortingTotalAmount ?? 0)` (Form.tsx:578-582) vs panel `pl.netWeight * data.palm_price_per_kg + pl.sortingTotalAmount` (Form.tsx:872-874). Tidak ada perhitungan baru.
- receipt-builder.ts: hanya line 113-114 (`const sortingWeight = load.sorting_weight;`); non-loads branch (139-157) utuh.
- printer-service.test.ts: hanya test 361 rename + asersi `-95 kg` → `-100 kg`.
- WeighingTransactionTest.php: hanya test sorting rename + asersi angka baru (805/1610000/1633750); sorting_deduction_weight 2.50, sorting_net_weight 47.50, sorting_total_amount 23750.00 TIDAK berubah.
- utils.test.ts: hanya test 1 (93-99) & test 2 (121-146); sortingDeductionWeight 5 / sortingNetWeight 95 / sortingTotalAmount 47500 (test 1) dan sortingNetWeight 47.5 / sortingTotalAmount 23750 (test 2) TIDAK berubah.

## F3 — Skenario user smoke test (read-only, APPROVE)

- `php artisan test --compact --filter=WeighingTransactionTest` → 26 passed, 198 assertions. Test `sorting weight is deducted from netto before palm pricing` mengunci 805.00 / 1610000.00 / 23750.00 / 1633750.00 (net/palm/sortiran/total) + CashierCashEntry 1633750.00.
- JS mirror: `npm run test:js -- tests/JS/utils.test.ts -t "subtracts sorting gross weight"` → 1 passed. utils.ts:154 `net = initial − deductionWeight − sortingWeight` menghasilkan 805/1610000/1633750.
- Render kartu "Hasil Hitung" (Form.tsx:479-587): semua nilai dari `calc.perLoad[i]` (useMemo calculateLoads, Form.tsx:138-140) — bukan hardcoded. Muatan #1: Netto Kotor 900, Potongan 5% -45, Sortiran (gross) -50, Netto 805, + Sortiran +23.750, Nilai Muatan Rp 1.633.750.
- Render panel (Form.tsx:814-1059): seksi HARGA (Sawit Rp 2.000, Sortiran Rp 500), BERAT (Muatan #1 (805) Rp 1.633.750, Netto Kotor (total) 900, Potongan -45, Sortiran (gross) -50, Netto Bersih 805), NILAI (Total Sawit 1.610.000, Potongan Sortiran -2,5, Total Sortiran +23.750, Total Kotor 1.633.750), final block Total Diterima Petani 1.633.750.
- **Catatan penting**: heading seksi PEMBAYARAN hanya render saat `data.debt_paid_amount > 0` (desain Todo 5 "seksi opsional — render hanya jika relevan"). Skenario user tanpa hutang → heading PEMBAYARAN tidak tampil, tapi final block "Total Diterima Petani" selalu render. Ini sesuai spesifikasi plan, bukan bug.
- Nota layar (Success.tsx:167-180) → `SORTIRAN 5%: -50 kg`, `NETTO: 805 kg`; receipt (receipt-builder.ts:111-125) → `#1 SORTIRAN: -50 kg (5%)`. Bagian HARGA nota tetap net (47,5 → Rp 23.750).
- Format output: `formatRupiah(1633750)` = "Rp 1.633.750"; `formatKgTrimmed(805)` = "805 kg" (id-ID, trailing zero di-drop).
- Evidence: `.omo/evidence/final-f3-fix-sortiran-gross-weight.txt`.

## F2 — Code quality review (VERDICT: APPROVE)

- Base commit `8dec094`; diff `8dec094..HEAD` menyentuh **tepat 8 file** yang diizinkan (stat: 295 insertions, 96 deletions). Tidak ada file lain (git status hanya `?? .omo/`).
- 5 commit sesuai strategi plan: 31d46c1 (T1), d5d5b5b (T2), 9699260 (T3), 1aad89d (T4), d2504dc (T5). Todo 6 tidak commit (verifikasi saja).
- Per-file:
  1. `WeighingTransaction.php:228` — satu variabel `$sortingNetWeight` → `$sortingWeight`. `$sortingWeight` (gross) sudah didefinisikan baris 224; `$sortingNetWeight` tetap dipakai baris 229 untuk `$sortingTotal` (basis pembayaran). ✓
  2. `utils.ts:154` — satu variabel `sortingNetWeight` → `sortingWeight`. `sortingNetWeight` tetap dipakai baris 155 untuk `sortingTotal`. `calculateTransaction` (dead code :229) tidak disentuh. ✓
  3. `WeighingTransactionTest.php` — hanya test 76-106: rename + 5 asersi angka (805.00/1610000.00/1633750.00×2/CashierCashEntry). `initial 900`, `deduction 45`, `sorting_deduction 2.50`, `sorting_net 47.50`, `sorting_total 23750` TIDAK berubah. Multi-load test 38-74 tidak disentuh. ✓
  4. `utils.test.ts` — hanya test 84-100 (net 681→676, palm 1756980→1744080, gross 1804480→1791580; sortingDeductionWeight/NetWeight/TotalAmount tetap) dan test 121-146 (rename + comment + net 807.5→805, palm 1615000→1610000, gross 1638750→1633750; sortingNetWeight 47.5 & sortingTotalAmount 23750 tetap). Test `keeps legacy behavior`/`defaults to zero` tidak disentuh. ✓
  5. `Success.tsx` — 8 baris diff, satu hunk di baris 171 (value `-${formatKg(load.sorting_weight)}` selalu gross). Label `SORTIRAN ${pct}%:`/`SORTIRAN:` tetap. Bagian HARGA 250-269 TIDAK disentuh. ✓
  6. `receipt-builder.ts` — line 113-114 saja: `const sortingWeight = load.sorting_weight;`. Suffix `(pct%)` tetap. Non-loads branch 139-157 tidak disentuh. ✓
  7. `printer-service.test.ts` — test 361 rename + asersi `-95 kg` → `-100 kg`. Semua `as any` (baris 544-783) PRE-EXISTING di base — bukan baru. ✓
  8. `Form.tsx` — 4 hunk, semua di kartu muatan (line 475) + panel kanan (line 702-724). Kartu "Hasil Hitung": 6 baris sesuai plan, null-safety `perLoad?.field ?? 0`, formula Nilai Muatan identik panel. Panel: 4 seksi HARGA/BERAT/NILAI/PEMBAYARAN, heading konsisten, caption konsisten per-komponen (`/60 not-italic` di kartu, `/70 italic` di panel — keduanya didokumentasikan di notepad Todo 4/5). Final block + Sisa Hutang + error block + tombol TIDAK berubah. Tidak ada state/useMemo baru. ✓
- Guardrails: sortingTotal tetap net ✓; guard sorting_weight tidak disentuh ✓; calculateTransaction tidak disentuh ✓; HARGA nota tetap net ✓; test ded=0 tidak berubah ✓.
- Stubs: grep `TODO|FIXME|HACK|as any|@ts-ignore|console.log` di 8 file → hanya `as any` pre-existing di printer-service.test.ts. Tidak ada stub/hardcoded baru.
- Matematika diverifikasi: 900−45−50=805; 805×2000=1.610.000; 47,5×500=23.750; total 1.633.750. TS test 1: 800−24−100=676; 676×2580=1.744.080; +47.500=1.791.580. ✓
- Catatan minor (bukan blocker): plan literal menempatkan Final block di dalam seksi PEMBAYARAN, implementasi menaruhnya di luar (selalu render) — konsisten dengan notepad Todo 5 ("Final block TETAP di bawah, selalu render") dan lebih benar secara UX (jumlah akhir harus selalu terlihat). Bukan deviasi bermasalah.
