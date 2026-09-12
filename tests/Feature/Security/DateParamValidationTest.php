<?php

use App\Models\User;

test('reports index rejects invalid date_start with redirect and session error', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $this->actingAs($user)
        ->get('/reports?date_start=garbage')
        ->assertRedirect()
        ->assertSessionHasErrors('date_start');
});

test('reports index accepts valid date range', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $this->actingAs($user)
        ->get('/reports?date_start=2026-01-01&date_end=2026-12-31')
        ->assertOk();
});

test('reports excel export rejects invalid date_start with redirect and session error', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $this->actingAs($user)
        ->get('/reports/export/excel?date_start=garbage')
        ->assertRedirect()
        ->assertSessionHasErrors('date_start');
});

test('reports pdf export rejects invalid date_start with redirect and session error', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $this->actingAs($user)
        ->get('/reports/export/pdf?date_start=garbage')
        ->assertRedirect()
        ->assertSessionHasErrors('date_start');
});
