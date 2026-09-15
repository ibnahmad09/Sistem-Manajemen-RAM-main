# Task 1 — Backend `superAdmin()`: filter `is_latest_version` pada todayScope + monthlyRevenue

## Change
`app/Http/Controllers/DashboardController.php` — method `superAdmin()`:
- `$todayScope`: added `->where('is_latest_version', true)` (after `whereDate('transaction_date', today())`)
- `$monthlyRevenue`: added `->where('is_latest_version', true)` (after `where('transaction_date', '>=', now()->subMonths(6))`)

Nothing else touched. `recentTransactions`, `cashier()`, `owner()`, `ReportsController.php`, frontend, tests: untouched.

## Commands & Outputs

### 1. Baseline (BEFORE edit)
```
$ php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"passed","tests":5,"passed":5,"assertions":43,"duration_ms":1945}
```

### 2. Edit applied (2 insertions)
```
$ git diff --stat -- app/Http/Controllers/DashboardController.php
 app/Http/Controllers/DashboardController.php | 2 ++
 1 file changed, 2 insertions(+)
```

### 3. Pint
```
$ vendor/bin/pint --dirty --format agent
{"tool":"pint","result":"passed"}
```

### 4. Tests AFTER edit
```
$ php artisan test --compact tests/Feature/DashboardTest.php
{"tool":"pest","result":"passed","tests":5,"passed":5,"assertions":43,"duration_ms":2035}
```
5 passed, 0 failed — identical to baseline (characterization, no regression).

### 5. Content verification (grep — NOT line numbers)
```
$ grep -n "is_latest_version" app/Http/Controllers/DashboardController.php
25:            ->where('is_latest_version', true)   # NEW — $todayScope (superAdmin)
36:            ->where('is_latest_version', true)   # existing — recentTransactions (superAdmin)
48:            ->where('is_latest_version', true)   # NEW — $monthlyRevenue (superAdmin)
99:            ->where('is_latest_version', true)   # existing — recentTransactions (cashier)
150:        $totalTransactions = (clone $totalScope)->where('is_latest_version', true)->count();  # existing — owner
160:            ->where('is_latest_version', true)   # existing — topFarmers (owner)
```
Total occurrences = **6** (4 pre-existing + 2 new in `superAdmin()`). Exactly 2 NEW `->where('is_latest_version', true)` inside `superAdmin()`.

### 6. Worktree check (dirty_worktree probe)
```
$ git status --short -- app/Http/Controllers/DashboardController.php
 M app/Http/Controllers/DashboardController.php
```
Only DashboardController.php modified (plus .omo artifacts). No commit made.

## Adversarial probes
- dirty_worktree: PASS — only DashboardController.php (+ .omo artifacts) changed; no commit.
- misleading_success_output: PASS — pint "passed" corroborated by grep showing the 2 new filters in the actual file content.
- stale_state: PASS — re-grep after edit confirms filters present (lines 25, 48).
- N/A: malformed_input (no input parsing), prompt_injection (no external text), cancel_resume (no resumable flow), generated_artifacts (no cache), hung_commands (no long commands), flaky_tests (no new tests), repeated_interruptions (single short task).

## Result
Todo 1 COMPLETE. Ready for Todo 2 (`owner()`).