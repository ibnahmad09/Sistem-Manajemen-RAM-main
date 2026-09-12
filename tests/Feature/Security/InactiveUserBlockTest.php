<?php

use App\Models\User;

test('active user can access role-protected routes', function () {
    $user = User::factory()->create(['role' => 'cashier', 'status' => 'active']);

    $this->actingAs($user)
        ->get(route('weighing.index'))
        ->assertOk();
});

test('inactive user is logged out and redirected to login with error when accessing role-protected route', function () {
    $user = User::factory()->create(['role' => 'cashier', 'status' => 'inactive']);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();

    $response = $this->get(route('weighing.index'));

    $response->assertRedirect(route('login'));
    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('inactive user is redirected to login when accessing reports index', function () {
    $user = User::factory()->create(['role' => 'owner', 'status' => 'inactive']);

    $this->actingAs($user)
        ->get(route('reports.index'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');
});

test('inactive user is redirected to login when accessing reports excel export', function () {
    $user = User::factory()->create(['role' => 'owner', 'status' => 'inactive']);

    $this->actingAs($user)
        ->get(route('reports.export.excel'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');
});
