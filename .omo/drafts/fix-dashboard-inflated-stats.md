---
slug: fix-dashboard-inflated-stats
status: awaiting-approval
intent: clear
review_required: false
pending-action: write .omo/plans/fix-dashboard-inflated-stats.md
approach: Tambahkan filter `is_latest_version = true` ke semua scope statistik dashboard admin & owner yang masih memakai `status != 'draft'` saja (mirror ReportsController), + test regression
---

# Draft: fix-dashboard-inflated-stats

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
| id | outcome | status | evidence |
|---|---|---|---|
| C1 superAdmin() | todayScope + monthlyRevenue menghitung hanya transaksi valid terbaru | active | app/Http/Controllers/DashboardController.php:24-30, 42-50 |
| C2 owner() | totalScope + monthlyRevenue menghitung hanya transaksi valid terbaru | active | app/Http/Controllers/DashboardController.php:129-139, 142-149 |
| C3 Feature test dashboard | bukti angka tanpa revisi/batal vs dengan revisi/batal | active | tests/Feature/DashboardStatsTest.php (baru) |
| C4 cashier() | DITOLAK user — di luar scope (dicatat sebagai temuan, tidak diubah) | removed | app/Http/Controllers/DashboardController.php:74-81 |

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
| Semantik "transaksi valid" | `is_latest_version = true` DAN `status != 'draft'` (persis filter ReportsController) | laporan (ReportsController.php:27-28) sudah pakai pola ini = definisi "output yang seharusnya" | ya |
| Revisi = nota baru | Transaksi hasil revisi dihitung SEBAGAI nota baru (transaction_date = tanggal revisi); versi lama (status 'revised', is_latest=false) TIDAK dihitung | konsisten dengan ReportsController & e2e "revisi menghasilkan nota baru" | ya |
| Batal = tidak ada | Transaksi status 'cancelled' TIDAK dihitung sama sekali | reversal keuangan sudah membatalkan efeknya; menghitungnya = dobel | ya |
| Perbaikan frontend tidak diperlukan | Halaman SuperAdmin.tsx / Owner.tsx hanya render props; fix cukup di controller | JS hanya format angka | ya |
| implementasi helper | Pakai scope Eloquent baru `scopeValid` di WeighingTransaction (atau inline where) — decide di plan; kedua duanya equivalent | — | ya |

## Findings (cited - path:lines)
1. Status transaksi: `draft`, `printed` (final), `revised` (versi lama), `cancelled` — WeighingTransactionController.php:229 ('revised'), :389/:402 ('cancelled'), :642 ('printed').
2. Revisi meng-archive row lama: `is_latest_version=false, status='revised'` TETAPI semua amount (gross_total_amount, final_paid_amount_rounded, initial_weight, net_weight, transaction_date) TIDAK diubah — WeighingTransactionController.php:227-231. Jadi row revised tetap "bernilai" untuk agregasi.
3. Batal juga hanya ubah status/is_latest, amount tetap — WeighingTransactionController.php:387-402. Row cancelled tetap "bernilai" untuk agregasi.
4. Dashboard superAdmin: `todayScope` = `whereDate(...)->where('status','!=','draft')` TANPA `is_latest_version` — DashboardController.php:24-25 → totalTransactionsToday/totalRevenueToday/timbanganKotorToday/timbanganBersihToday (27-30) ikut ter-inflasi. monthlyRevenue juga TANPA filter is_latest (42-50).
5. Dashboard owner: `monthlyRevenue` TANPA filter is_latest (129-139); `totalScope` = `where('status','!=','draft')` TANPA is_latest (142) → totalRevenue/totalPaidOut/totalTimbanganKotor/totalTimbanganBersih (144-147) ter-inflasi. INKONSISTEN: `totalTransactions` (148) dan `topFarmers` (158) PAKAI `is_latest_version=true` — jadi count benar, sum salah.
6. Reference "seharusnya": ReportsController memakai `where('is_latest_version', true)->where('status','!=','draft')` — ReportsController.php:27-28. Laporan sudah benar; dashboard tidak.
7. Dampak nyata: setelah fitur revisi & batal (commit ad017f2) — revisi nota → revenue/berat/dibayarkan dihitung 2x (row lama revised + row baru printed); batal nota → revenue tetap muncul padahal sudah dibatalkan.
8. Cashier dashboard punya bug sama (todayScope, DashboardController.php:74-76) — di luar scope permintaan user, ditanyakan.
9. Tidak ada test yang menutupi DashboardController (codegraph: "no covering tests found").

## Decisions (with rationale)
- D1: Filter statistik dashboard = `is_latest_version = true` + `status != 'draft'` — mirror ReportsController.php:27-28 (satu-satunya referensi perilaku benar yang sudah ada di repo).
- D2: Scope = method `superAdmin()` dan `owner()` di DashboardController. Frontend (SuperAdmin.tsx/Owner.tsx) tidak berubah — hanya render props.
- D3: Tests-after dengan Pest feature test baru (konvensi proyek: RefreshDatabase dari Pest.php, `php artisan make:test --pest`). Tidak ada test dashboard existing untuk di-update.

## Scope IN
- `app/Http/Controllers/DashboardController.php`: superAdmin() todayScope + monthlyRevenue; owner() totalScope + monthlyRevenue.
- Test baru `tests/Feature/DashboardStatsTest.php`: happy path (hanya transaksi valid terhitung) + failure/edge (revisi tidak dobel-count; cancelled tidak terhitung).
- (opsional, bila user setuju) cashier() todayScope.

## Scope OUT (Must NOT have)
- TIDAK menyentuh ReportsController (sudah benar).
- TIDAK menyentuh halaman frontend dashboard (SuperAdmin.tsx, Owner.tsx, Cashier.tsx, dashboard.tsx).
- TIDAK menyentuh fitur revisi/batal di WeighingTransactionController.
- TIDAK migrasi database, TIDAK dependency baru, TIDAK ubah skema.
- TIDAK merubah semantik totalDebt/totalFarmers/recentTransactions/topFarmers/totalTransactions (sudah benar).
- TIDAK refactor kode tidak terkait.

## Open questions
Q1 (scope, owner-decision): cashier dashboard punya bug identik — ikut diperbaiki atau admin+owner saja?
  → JAWABAN USER: Admin + owner saja (Recommended). Cashier TIDAK diubah.
Q2 (test strategy): tests-after dengan Pest feature test — disetujui?
  → JAWABAN USER: Tests-after, Pest feature test (Recommended).

## Approval gate
status: approved
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
<!-- 2026-09-15: user menjawab Q1 (admin+owner saja) + Q2 (tests-after) → approval diberikan → generate .omo/plans/fix-dashboard-inflated-stats.md. -->