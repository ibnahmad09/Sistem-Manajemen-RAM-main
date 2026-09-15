# Task 3 Evidence — 4 regression tests (revisi/batal, admin/owner)

Plan: `.omo/plans/fix-dashboard-inflated-stats.md` Todo 3
Date: 2026-09-15

## Baseline (full suite, BEFORE writing tests)

```
php artisan test --compact
{"tool":"pest","result":"passed","tests":135,"passed":135,"assertions":743,"duration_ms":11317}
```

Baseline count: **135 passed, 0 failed**.

## Changes

- `tests/Feature/DashboardTest.php`:
  - Added `use App\Models\WeighingTransaction;` to import section (after existing `use App\Models\User;`).
  - Appended 4 new tests at END of file (existing 5 tests untouched, `test('...')` style):
    - T-a `super admin dashboard mengecualikan transaksi yang telah direvisi dari statistik hari ini`
    - T-b `super admin dashboard mengecualikan transaksi yang dibatalkan dari statistik hari ini`
    - T-c `owner dashboard mengecualikan transaksi yang direvisi dari total dan laporan bulanan`
    - T-d `owner dashboard mengecualikan transaksi yang dibatalkan dari total`
  - Revenue assertions read from DB via closure: `fn ($v) => $v == WeighingTransaction::where('is_latest_version', true)->value('gross_total_amount')` (no hardcoding).
- No changes to `tests/Pest.php`, controllers, or existing tests.

## Run 1 — DashboardTest file (9/9 pass)

```
php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"passed","tests":9,"passed":9,"assertions":111,"duration_ms":2268}
```

## Red-green check (MANDATORY)

### Step 1 — remove `->where('is_latest_version', true)` from `$todayScope` in `superAdmin()`

```
php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"failed","tests":9,"passed":7,"assertions":105,"duration_ms":2392,"failed":2,
 "failures":[
  {"test":"...super_admin_dashboard_mengecualikan_transaksi_yang_telah_direvisi_dari_statistik_hari_ini",
   "message":"Property [stats.totalTransactionsToday] does not match the expected value.\nFailed asserting that 2 is identical to 1."},
  {"test":"...super_admin_dashboard_mengecualikan_transaksi_yang_dibatalkan_dari_statistik_hari_ini",
   "message":"Property [stats.totalTransactionsToday] does not match the expected value.\nFailed asserting that 1 is identical to 0."}]}
```

→ **T-a FAIL (2≠1, revised counted double) and T-b FAIL (1≠0, cancelled counted)** — tests catch the bug. Filter RESTORED.

### Step 2 — remove `->where('is_latest_version', true)` from `$totalScope` in `owner()`

```
php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"failed","tests":9,"passed":7,"assertions":105,"duration_ms":2301,"failed":2,
 "failures":[
  {"test":"...owner_dashboard_mengecualikan_transaksi_yang_direvisi_dari_total_dan_laporan_bulanan",
   "message":"Property [stats.totalRevenue] was marked as invalid using a closure.\nFailed asserting that false is true."},
  {"test":"...owner_dashboard_mengecualikan_transaksi_yang_dibatalkan_dari_total",
   "message":"Property [stats.totalRevenue] was marked as invalid using a closure.\nFailed asserting that false is true."}]}
```

→ **T-c FAIL and T-d FAIL (revenue closure invalid — sum includes revised/cancelled rows)** — tests catch the bug. Filter RESTORED.

### Step 3 — after both restores

```
php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"passed","tests":9,"passed":9,"assertions":111,"duration_ms":2184}
```

→ **9/9 pass.**

## Full suite after todo (baseline + 4)

```
php artisan test --compact
{"tool":"pest","result":"passed","tests":139,"passed":139,"assertions":811,"duration_ms":9203}
```

→ **139 passed = baseline 135 + 4 new, 0 failed.**

## Formatting

```
vendor/bin/pint --dirty --format agent
{"tool":"pint","result":"passed"}
```

## Verification of content

- `grep -c "is_latest_version" app/Http/Controllers/DashboardController.php` → **8** (4 existing + 2 superAdmin + 2 owner; red-green edits fully restored)
- `grep -cE "^\s*(test|it)\(" tests/Feature/DashboardTest.php` → **9** (5 existing + 4 new)
- `git diff app/Http/Controllers/DashboardController.php` → only the 4 `+->where('is_latest_version', true)` additions from Todo 1+2 (no residue from red-green edits)