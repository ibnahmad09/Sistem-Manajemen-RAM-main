# Task 4 — Backend Assert: `weighing.create?draft=X` sends `draft.debt_paid_amount` intact

## Goal
Jaring pengaman sisi server untuk bug frontend draft-debt: GET `weighing.create?draft=X` harus mengirim prop Inertia `draft.debt_paid_amount` utuh (`'100000.00'`) ke frontend.

## Change
- File: `tests/Feature/Security/DraftDebtPreserveTest.php`
- Added `use Inertia\Testing\AssertableInertia as Assert;` (top of file)
- Added 1 new Pest test (existing 4 tests untouched):

```php
test('weighing.create with draft sends debt_paid_amount intact to the frontend', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'debt_paid_amount' => 100000,
    ]) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    $this->actingAs($cashier)
        ->get(route('weighing.create', ['draft' => $draft->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Weighing/Form')
            ->where('draft.debt_paid_amount', '100000.00'));
});
```

## Verification

### Pint (gate `@lint:check`)
```
vendor/bin/pint --dirty --format agent
{"tool":"pint","result":"passed"}
```

### Test run
```
php artisan test --compact --filter=DraftDebtPreserveTest
{"tool":"pest","result":"passed","tests":5,"passed":5,"assertions":22,"duration_ms":1867}
```

**5 passed (4 existing + 1 baru), 22 assertions.**

## Notes
- Backend sudah benar (fix #6b, commit `edcb93a`): `fillTransactionData` menyimpan `$validated['debt_paid_amount'] ?? 0`.
- Cast model `debt_paid_amount => 'decimal:2'` → Inertia serialisasi string `'100000.00'` → assertion `->where('draft.debt_paid_amount', '100000.00')` valid (pola sama `ReportsExportTest.php:81`).
- `WeighingTransactionController::create()` merender `Weighing/Form` dengan `'draft' => $draft` (model `WeighingTransaction` via `activeDraft()` scope).