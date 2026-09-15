# fix-dashboard-inflated-stats - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** Dashboard admin dan owner akan menghitung angka (revenue, berat, jumlah transaksi, grafik bulanan) hanya dari nota timbangan yang valid dan terbaru — nota yang pernah direvisi tidak lagi dihitung dobel, dan nota yang dibatalkan tidak lagi muncul di statistik. Disertai 4 tes otomatis agar bug ini tidak kembali di masa depan.

**Why this approach:** Akar masalahnya empat query dashboard yang hanya menyaring "bukan draft" tanpa menyaring "versi terbaru" — padahal pola yang benar sudah ada di halaman Laporan. Jadi perbaikannya menyalin pola yang sudah terbukti benar, dan tes regression memastikan perilaku (bukan sekadar menyalin angka).

**What it will NOT do:** Tidak mengubah dashboard kasir, halaman laporan, halaman depan (React), alur revisi/batal nota, atau struktur database. Tidak memperbaiki bug serupa yang juga ada di dashboard kasir (di luar permintaan Anda).

**Effort:** Short
**Risk:** Low - 4 baris filter query + 4 tes regression; pola sudah terbukti di ReportsController
**Decisions to sanity-check:** (1) Dashboard kasir sengaja TIDAK ikut diperbaiki walau bug-nya serupa (sesuai jawaban Anda: "Admin + owner saja") — tercatat sebagai temuan; (2) Tes ditambahkan ke file tes yang sudah ada, bukan file baru; (3) Filter dipasang inline mengikuti pola reports, bukan helper baru.

Your next move: jalankan eksekusi (mis. `/start-work`), atau minta high-accuracy review tambahan dulu. Detail eksekusi lengkap di bawah.

---

> TL;DR (machine): Short, Low risk — 4 filter `is_latest_version` di DashboardController (superAdmin + owner) + 4 test regression Pest di DashboardTest; tests-after.

## Scope
### Must have
- `app/Http/Controllers/DashboardController.php` method `superAdmin()`: tambahkan filter `->where('is_latest_version', true)` pada `$todayScope` (baris 24-25) dan `$monthlyRevenue` (baris 42-50).
- `app/Http/Controllers/DashboardController.php` method `owner()`: tambahkan filter `->where('is_latest_version', true)` pada `$monthlyRevenue` (baris 129-139) dan `$totalScope` (baris 142).
- `tests/Feature/DashboardTest.php`: tambahkan 4 test regression baru (revisi & batal; super admin & owner) di akhir file — file existing berisi 5 test, jangan diubah/dihapus.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- TIDAK mengubah `cashier()` di DashboardController (keputusan user: admin + owner saja; bug identik dicatat sebagai temuan, tidak diperbaiki).
- TIDAK mengubah `ReportsController.php` (sudah benar — justru referensi pola).
- TIDAK mengubah frontend dashboard (`resources/js/pages/Dashboard/SuperAdmin.tsx`, `Owner.tsx`, `Cashier.tsx`, `dashboard.tsx`) — hanya render props.
- TIDAK mengubah `WeighingTransactionController.php` (fitur revisi/batal) atau model.
- TIDAK menambah migrasi, dependency, atau mengubah skema DB.
- TIDAK mengubah baris 148 (`(clone $totalScope)->where('is_latest_version', true)->count()` — menjadi redundant tapi harmless; refactor di luar scope).
- TIDAK mengubah helper `tests/Pest.php` (`weighingFormData`, `createTestFarmer`).
- TIDAK refactor kode tidak terkait; TIDAK memperbaiki hal lain di luar dashboard admin/owner.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: **tests-after** + Pest (RefreshDatabase otomatis untuk semua Feature test via `tests/Pest.php:18-20`) — disetujui user.
- Evidence: `.omo/evidence/fix-dashboard-inflated-stats/task-<N>-fix.md` (per todo) dan `.omo/evidence/fix-dashboard-inflated-stats/f<F>-*.txt` (final wave).
- QA per todo: pint, test filter, full suite. Final wave: compliance audit, code quality, manual QA browser, scope fidelity.

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

- **Wave 1** (sekuensial — file yang sama): Todo 1 (superAdmin) → Todo 2 (owner).
- **Wave 2**: Todo 3 (test regression, blocked by 1+2).
- **Final wave F1-F4** (paralel setelah semua todo).

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | — | 2, 3 | — (file sama dengan 2 → jangan paralel) |
| 2 | 1 | 3 | — |
| 3 | 1, 2 | F2, F3 | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Backend `superAdmin()`: tambah filter `is_latest_version` pada todayScope + monthlyRevenue
  What to do / Must NOT do: DI DALAM method `superAdmin()` (`app/Http/Controllers/DashboardController.php:17-64`): (a) `$todayScope` (baris 24-25) — tambahkan `->where('is_latest_version', true)` pada chain (setelah `->whereDate('transaction_date', today())` atau setelah `->where('status', '!=', 'draft')`; urutan where bebas). (b) `$monthlyRevenue` (baris 42-50) — tambahkan `->where('is_latest_version', true)` pada chain (mis. tepat setelah baris 47 `->where('status', '!=', 'draft')`). TIDAK mengubah apa pun di luar kedua chain ini — khususnya TIDAK menyentuh `recentTransactions` (baris 34-39, sudah benar), TIDAK `cashier()`, TIDAK frontend, TIDAK ReportsController.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2, 3
  References (executor has NO interview context - be exhaustive): `app/Http/Controllers/DashboardController.php:24-30` (todayScope → totalTransactionsToday/totalRevenueToday/timbanganKotorToday/timbanganBersihToday), `app/Http/Controllers/DashboardController.php:42-50` (monthlyRevenue chart); pola filter yang BENAR (referensi "seharusnya"): `app/Http/Controllers/ReportsController.php:27-28` (`where('is_latest_version', true)->where('status', '!=', 'draft')`); status transaksi: 'draft'/'printed'/'revised'/'cancelled' — `app/Http/Controllers/WeighingTransactionController.php:229,389,402,642`.
  Acceptance criteria (agent-executable): verifikasi KONTEN (jangan andalkan nomor baris — pint bisa menggeser baris): di method `superAdmin()` ada 2 `->where('is_latest_version', true)` BARU (di chain `$todayScope` dan `$monthlyRevenue`); total kemunculan `is_latest_version` di file = 6 setelah todo 1 (4 SUDAH ADA di file: line 35 recentTransactions superAdmin, line 97 recentTransactions cashier, line 148 totalTransactions owner, line 158 topFarmers owner — jangan dihitung sebagai punya todo ini); `vendor/bin/pint --dirty --format agent` → `{"tool":"pint","result":"passed"}`.
  QA scenarios (name the exact tool + invocation): happy: `vendor/bin/pint --dirty --format agent` exit 0 — Evidence `.omo/evidence/fix-dashboard-inflated-stats/task-1-fix.md`; failure: grep konten — jika filter tidak terpasang di kedua titik (hanya 1 atau 0 `where('is_latest_version', true)` di method superAdmin), todo GAGAL dan jangan lanjut ke todo 2.
  Commit: Y | fix(dashboard): super admin stats

- [x] 2. Backend `owner()`: tambah filter `is_latest_version` pada totalScope + monthlyRevenue
  What to do / Must NOT do: DI DALAM method `owner()` (`app/Http/Controllers/DashboardController.php:126-177`): (a) `$monthlyRevenue` (baris 129-139) — tambahkan `->where('is_latest_version', true)` pada chain (mis. setelah baris 136 `->where('status', '!=', 'draft')`). (b) `$totalScope` (baris 142) — ubah menjadi `WeighingTransaction::where('is_latest_version', true)->where('status', '!=', 'draft')` (menimpa semua sum di baris 144-147). TIDAK mengubah baris 148 (`totalTransactions` — where is_latest_version di sana jadi redundant tapi harmless, biarkan), TIDAK baris 149 (`totalDebt = Farmer::sum('balance')` — sudah benar karena balance tersinkron), TIDAK `topFarmers` (baris 152-163, sudah benar), TIDAK frontend.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3
  References (executor has NO interview context - be exhaustive): `app/Http/Controllers/DashboardController.php:129-149`; pola benar: `app/Http/Controllers/ReportsController.php:27-28`; inkonsistensi saat ini: `totalTransactions` (baris 148) & `topFarmers` (baris 158) SUDAH pakai is_latest_version sedangkan sum (144-147) TIDAK — itu bukti bug di plan (lih. draft findings).
  Acceptance criteria (agent-executable): `vendor/bin/pint --dirty --format agent` → passed; verifikasi KONTEN: di method `owner()` ada 2 `->where('is_latest_version', true)` BARU (di chain `$monthlyRevenue` dan `$totalScope`); total kemunculan `is_latest_version` di file = 8 (4 existing + 2 superAdmin + 2 owner).
  QA scenarios (name the exact tool + invocation): happy: pint exit 0 — Evidence `.omo/evidence/fix-dashboard-inflated-stats/task-2-fix.md`; failure: verifikasi konten — jika kemunculan `is_latest_version` di file ≠ 8 (4 existing + 2 superAdmin + 2 owner) atau tidak ada 2 `where('is_latest_version', true)` BARU di method `owner()`, GAGAL.
  Commit: Y | fix(dashboard): owner stats

- [x] 3. Test: tambah 4 regression test (revisi/batal, admin/owner) di `tests/Feature/DashboardTest.php`
  What to do / Must NOT do: TAMBAHKAN 4 test baru DI AKHIR `tests/Feature/DashboardTest.php` (file saat ini 123 baris, 5 test — JANGAN hapus/edit test existing; JANGAN tulis ulang seluruh file dengan Write — Write menimpa seluruh file, gunakan Edit/apply_patch untuk append). Gunakan gaya `test('...')` (bukan `it(...)`) agar konsisten dengan file + agar grep F1 valid. Keputusan: EXTEND file existing (bukan file baru `DashboardStatsTest.php` dari draft C3) — memanfaatkan import/pola assertInertia yang sudah ada; ini penyimpangan sadar dari draft, tercatat di sini. Tambahkan `use App\Models\WeighingTransaction;` di bagian `use` (file saat ini hanya `use App\Models\User;`). Pakai helper global dari `tests/Pest.php:48-74`: `createTestFarmer()`, `weighingFormData($farmer)` (default: 1 load gross 1000/tare 200, deduction 3%, price 2580 → initial 800, net 776, gross_total 2002080, final_paid 2002080). Pola setup transaksi/revisi/batal dari `tests/Feature/WeighingRevisionVoidTest.php:24-84` (finalize via `post(route('weighing.store'), ... + ['action' => 'finalize'])`; revisi via `put(route('weighing.update', $tx), ... + ['revision_reason' => '...'])`; batal via `post(route('weighing.cancel', $tx))`). Impor User/WeighingTransaction/Farmer sesuai kebutuhan; user dibuat `User::factory()->create(['role' => ...])`.
  4 test baru (judul Pest, urut):
  T-a `'super admin dashboard mengecualikan transaksi yang telah direvisi dari statistik hari ini'`: cashier create+finalize (data default) → `$superAdmin` login → `get(route('dashboard.super-admin'))` → assertInertia: `component('Dashboard/SuperAdmin')`, `where('stats.totalTransactionsToday', 1)`, `where('stats.totalRevenueToday', fn ($v) => $v == WeighingTransaction::where('is_latest_version', true)->value('gross_total_amount'))` (membaca dari DB, bukan hardcode — bukti TIDAK dobel: kalau dobel, closure gagal karena nilainya 2x). Lalu revisi via `put`, `$old->refresh()` → expect `$old->status` 'revised' & `$old->is_latest_version` false. GET dashboard lagi → `where('stats.totalTransactionsToday', 1)` DAN `where('stats.totalRevenueToday', fn ($v) => $v == WeighingTransaction::where('is_latest_version', true)->value('gross_total_amount'))`.
  T-b `'super admin dashboard mengecualikan transaksi yang dibatalkan dari statistik hari ini'`: cashier create+finalize → `post(route('weighing.cancel', $tx))` → get dashboard → `where('stats.totalTransactionsToday', 0)`, `where('stats.totalRevenueToday', fn ($v) => $v == 0)`, `where('stats.timbanganKotorToday', fn ($v) => $v == 0.0)`.
  T-c `'owner dashboard mengecualikan transaksi yang direvisi dari total dan laporan bulanan'`: cashier create+finalize → revisi (revision_reason wajib) → owner login → `get(route('dashboard.owner'))` → assertInertia: `component('Dashboard/Owner')`, `where('stats.totalTransactions', 1)`, `where('stats.totalRevenue', fn ($v) => $v == WeighingTransaction::where('is_latest_version', true)->value('gross_total_amount'))`, `where('stats.totalTimbanganKotor', fn ($v) => $v == 800.0)` (initial 800; kalau dobel jadi 1600 → closure gagal), `where('monthlyRevenue.0.revenue', fn ($v) => $v == WeighingTransaction::where('is_latest_version', true)->value('gross_total_amount'))` (indeks 0 = bulan berjalan karena orderBy desc).
  T-d `'owner dashboard mengecualikan transaksi yang dibatalkan dari total'`: cashier create+finalize → cancel → owner login → get dashboard → `where('stats.totalRevenue', fn ($v) => $v == 0)`, `where('stats.totalTransactions', 0)`.
  Must NOT: JANGAN hapus/edit 5 test existing; JANGAN ubah Pest.php; JANGAN ubah controller (todo ini hanya menulis test).
  Parallelization: Wave 2 | Blocked by: 1, 2 | Blocks: F2, F3
  References (executor has NO interview context - be exhaustive): `tests/Feature/DashboardTest.php:1-123` (5 test existing + pola assertInertia/where closure, mis. baris 88-91), `tests/Pest.php:48-74` (helper), `tests/Feature/WeighingRevisionVoidTest.php:24-84` (pola revisi + cancel + refresh + expect status), status values `app/Http/Controllers/WeighingTransactionController.php:229,389,402,642`, routes `routes/web.php:29-44` (`dashboard.super-admin`, `dashboard.owner`).
  Acceptance criteria (agent-executable): `php artisan test --compact tests/Feature/DashboardTest.php` → 9 passed (5 existing + 4 baru), 0 failed. PENTING: `--filter` di Pest mencocokkan STRING DESKRIPSI test, bukan nama file — `--filter=DashboardTest` TIDAK akan memilih test apa pun; jalankan lewat PATH FILE. Untuk suite penuh: SEBELUM menulis test, jalankan `php artisan test --compact` dan catat baseline count; setelah todo selesai jalankan lagi → count = baseline + 4, 0 failure (JANGAN hardcode 135/139 — jumlah bisa berubah sejak plan ini ditulis).
  QA scenarios (name the exact tool + invocation): happy: jalankan `php artisan test --compact tests/Feature/DashboardTest.php` — 9/9 pass — Evidence `.omo/evidence/fix-dashboard-inflated-stats/task-3-tests.md` (tempel output kedua run). failure (red-green check, WAJIB): buktikan test menangkap bug — (1) TEMPORER hapus `->where('is_latest_version', true)` pada chain `$todayScope` DI METHOD `superAdmin()` (cari berdasarkan KONTEN, BUKAN nomor baris — jangan sentuh filter status `'draft'`) → `php artisan test --compact tests/Feature/DashboardTest.php` → T-a dan T-b GAGAL → RESTORE file. (2) Ulangi untuk chain `$totalScope` DI METHOD `owner()` → T-c dan T-d GAGAL → RESTORE. (3) Setelah kedua restore: jalankan ulang → 9/9 pass. Catat hasil tiap run di evidence. Jika test TIDAK gagal saat filter dihapus, test lemah → perbaiki assertion (pastikan transaksi difinalize dengan `['action' => 'finalize']` agar status = 'printed', bukan 'draft').
  Commit: Y | test(dashboard): regression revisi & batal

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit
  What: verifikasi seluruh deliverables plan terpasang. Run: `grep -n "is_latest_version" app/Http/Controllers/DashboardController.php` → 8 kemunculan `'is_latest_version', true` (4 SUDAH ADA: recentTransactions superAdmin, recentTransactions cashier, totalTransactions owner, topFarmers owner + 4 BARU: 2 di method superAdmin, 2 di method owner); `grep -cE "^\s*(test|it)\(" tests/Feature/DashboardTest.php` → 9 (5 existing + 4 baru); pastikan T-a s/d T-d ada. Verdict: APPROVE/REJECT. Evidence `.omo/evidence/fix-dashboard-inflated-stats/f1-compliance.txt`.
- [x] F2. Code quality review
  What: `vendor/bin/pint --dirty --format agent` → passed; `php artisan test --compact` → baseline (dicatat saat todo 3) + 4 passed, 0 failure; kode mengikuti pola `ReportsController.php:27-28`; tidak ada duplikasi/refactor berlebihan. Verdict: APPROVE/REJECT. Evidence `.omo/evidence/fix-dashboard-inflated-stats/f2-quality.txt`.
- [x] F3. Real manual QA (browser)
  What: ikuti konvensi e2e proyek (seed SQLite, `php artisan --env=e2e serve` :8010; lihat `.omo/evidence/weighing-history-search-nama-petani/f6-e2e.txt` untuk resep setup): login super admin → input timbangan → finalize → catat angka dashboard (revenue hari ini) → revisi nota (ubah muatan + alasan) → dashboard: revenue TIDAK dobel (sama dengan nota baru) → batal nota lain → dashboard: revenue turun ke 0 untuk nota itu. Ulangi cek login owner: totalRevenue konsisten (tidak dobel; tidak termasuk yang dibatalkan). Catat angka sebelum/sesudah + screenshot (2 gambar) sebagai bukti. Verdict: APPROVE/REJECT. Evidence `.omo/evidence/fix-dashboard-inflated-stats/f3-manual-qa.txt` (+ screenshot).
- [x] F4. Scope fidelity
  What: `git diff --stat` (+ `git status --short`) → file berubah HANYA `app/Http/Controllers/DashboardController.php` + `tests/Feature/DashboardTest.php` (+ artifact `.omo/`); TIDAK ada perubahan di `cashier()` / ReportsController / frontend / WeighingTransactionController / migrasi. Verdict: APPROVE/REJECT. Evidence `.omo/evidence/fix-dashboard-inflated-stats/f4-scope.txt`.

## Commit strategy
- SATU squash commit setelah F1-F4: `fix(dashboard): statistik super admin & owner hanya menghitung transaksi valid terbaru` — mencakup todos 1-3 + verifikasi F1-F4.
- File yang di-commit: `app/Http/Controllers/DashboardController.php`, `tests/Feature/DashboardTest.php`, + artifact plan `.omo/plans/fix-dashboard-inflated-stats.md`, `.omo/drafts/fix-dashboard-inflated-stats.md`, `.omo/evidence/fix-dashboard-inflated-stats/**` (konvensi commit sebelumnya, lihat `ad017f2`).
- TIDAK commit: `.omo/boulder.json`, `.omo/run-continuation/**`, `.omo/start-work/**`, artifact plan lain (constraint user eksplisit, sama seperti commit sebelumnya).
- Worktree: seluruh perubahan di working tree saat ini (belum ada commit untuk plan ini).

## Success criteria
- Nota yang DIREVISI: revenue/transaksi/timbangan di dashboard super admin & owner dihitung SEKALI (hanya versi terbaru) — tidak dobel.
- Nota yang DIBATALKAN: tidak muncul sama sekali di statistik super admin & owner.
- Grafik revenue 6 bulan (super admin) & Laporan Bulanan (owner) konsisten dengan laporan (ReportsController).
- `php artisan test --compact` → seluruh suite hijau: baseline + 4 test baru, 0 failure.
- Cashier dashboard, ReportsController, frontend dashboard, dan WeighingTransactionController TIDAK berubah.