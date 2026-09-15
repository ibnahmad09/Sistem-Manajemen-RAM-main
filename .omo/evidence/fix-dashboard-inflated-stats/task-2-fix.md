# Task 2 — Backend `owner()`: filter `is_latest_version` pada totalScope + monthlyRevenue

Date: 2026-09-15
Plan: `.omo/plans/fix-dashboard-inflated-stats.md` (Todo 2)

## Changes

`app/Http/Controllers/DashboardController.php`, method `owner()` — exactly 2 new filters:

1. `$monthlyRevenue` chain (after `->where('transaction_date', '>=', now()->subMonths(12))`):
   ```php
   ->where('transaction_date', '>=', now()->subMonths(12))
   ->where('is_latest_version', true)
   ->where('status', '!=', 'draft')
   ```
2. `$totalScope` (overrides all sums: totalRevenue, totalPaidOut, totalTimbanganKotor, totalTimbanganBersih):
   ```php
   $totalScope = WeighingTransaction::where('is_latest_version', true)
       ->where('status', '!=', 'draft');
   ```

Pattern matches reference `app/Http/Controllers/ReportsController.php:27-28`.

## Commands run

### Baseline (BEFORE edit)
```
$ php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"passed","tests":5,"passed":5,"assertions":43,"duration_ms":1862}
```

### After edit — grep content verification
```
$ grep -n "is_latest_version" app/Http/Controllers/DashboardController.php
25:            ->where('is_latest_version', true)   # superAdmin todayScope      (Todo 1)
36:            ->where('is_latest_version', true)   # superAdmin recentTx        (pre-existing)
48:            ->where('is_latest_version', true)   # superAdmin monthlyRevenue  (Todo 1)
99:            ->where('is_latest_version', true)   # cashier recentTx           (pre-existing)
138:            ->where('is_latest_version', true)   # owner monthlyRevenue       (NEW — Todo 2)
145:        $totalScope = WeighingTransaction::where('is_latest_version', true)  # (NEW — Todo 2)
152:            ->where('is_latest_version', true)   # owner totalTransactions    (pre-existing)
162:            ->where('is_latest_version', true)   # owner topFarmers           (pre-existing)
```
Total = 8 occurrences (4 pre-existing + 2 superAdmin + 2 owner). ✓

### Pint
```
$ vendor/bin/pint --dirty --format agent
{"tool":"pint","result":"passed"}
```

### After edit — test suite
```
$ php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"passed","tests":5,"passed":5,"assertions":43,"duration_ms":1979}
```
Identical to baseline (5 passed / 43 assertions). No regression.

## Adversarial classes

- dirty_worktree: `git status --short` before edit showed only `app/Http/Controllers/DashboardController.php` (+ `.omo/` artifacts) modified — Todo 1's 2 insertions. After edit, still only DashboardController.php among source files. Nothing committed.
- misleading_success_output: pint "passed" alone not used as proof — grep output above shows the 2 new filters at lines 138 & 145 inside `owner()`.
- stale_state: re-grep after edit confirms filters present (lines 138, 145).
- N/A: malformed_input (no new input parsing), prompt_injection (no external text), cancel_resume (no resumable flow), generated_artifacts (no cache), hung_commands (no long commands), flaky_tests (no new tests here), repeated_interruptions (single short task).

## Result

Todo 2 complete. `owner()` now filters `is_latest_version = true` on both `$monthlyRevenue` and `$totalScope`. `totalTransactions` (line 152) and `topFarmers` (line 162) filters now redundant-but-harmless — left untouched per plan.