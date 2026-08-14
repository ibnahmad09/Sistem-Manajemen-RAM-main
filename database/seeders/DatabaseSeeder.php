<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Super Admin
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@sisawit.com',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        // Create Cashier
        User::create([
            'name' => 'Kasir 1',
            'email' => 'kasir@sisawit.com',
            'password' => Hash::make('password'),
            'role' => 'cashier',
            'status' => 'active',
        ]);

        // Create Owner
        User::create([
            'name' => 'Owner',
            'email' => 'owner@sisawit.com',
            'password' => Hash::make('password'),
            'role' => 'owner',
            'status' => 'active',
        ]);

        // Call other seeders
        $this->call([
            FarmerSeeder::class,
            PalmPriceSeeder::class,
        ]);
    }
}
