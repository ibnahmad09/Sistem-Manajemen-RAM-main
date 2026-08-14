<?php

namespace Database\Seeders;

use App\Models\PalmPrice;
use App\Models\User;
use Illuminate\Database\Seeder;

class PalmPriceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first admin user
        $admin = User::where('role', 'super_admin')->first();

        if (! $admin) {
            $admin = User::first();
        }

        $prices = [
            [
                'price_per_kg' => 1500.00,
                'effective_date' => now()->subDays(30),
                'note' => 'Harga awal bulan lalu',
                'created_by' => $admin->id,
            ],
            [
                'price_per_kg' => 1650.00,
                'effective_date' => now()->subDays(15),
                'note' => 'Kenaikan harga pertengahan bulan',
                'created_by' => $admin->id,
            ],
            [
                'price_per_kg' => 1750.00,
                'effective_date' => now()->subDays(5),
                'note' => 'Harga terbaru - stabil',
                'created_by' => $admin->id,
            ],
        ];

        foreach ($prices as $price) {
            PalmPrice::create($price);
        }
    }
}
