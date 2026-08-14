<?php

namespace Database\Seeders;

use App\Models\Farmer;
use Illuminate\Database\Seeder;

class FarmerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $farmers = [
            [
                'name' => 'Budi Santoso',
                'phone' => '081234567890',
                'address' => 'Jl. Sawit Raya No. 12, Desa Makmur',
                'balance' => 0,
                'status' => 'active',
            ],
            [
                'name' => 'Siti Aminah',
                'phone' => '081234567891',
                'address' => 'Jl. Kebun Sawit No. 45, Desa Sejahtera',
                'balance' => 0,
                'status' => 'active',
            ],
            [
                'name' => 'Ahmad Yani',
                'phone' => '081234567892',
                'address' => 'Jl. Perkebunan No. 78, Desa Subur',
                'balance' => 0,
                'status' => 'active',
            ],
            [
                'name' => 'Dewi Lestari',
                'phone' => '081234567893',
                'address' => 'Jl. Tani Makmur No. 23, Desa Berkah',
                'balance' => 0,
                'status' => 'active',
            ],
            [
                'name' => 'Hendra Wijaya',
                'phone' => '081234567894',
                'address' => 'Jl. Sawit Indah No. 56, Desa Jaya',
                'balance' => 0,
                'status' => 'active',
            ],
            [
                'name' => 'Rina Kusuma',
                'phone' => null,
                'address' => 'Desa Maju Jaya',
                'balance' => 0,
                'status' => 'active',
            ],
            [
                'name' => 'Bambang Sutrisno',
                'phone' => '081234567895',
                'address' => 'Jl. Kebun Raya No. 89, Desa Sentosa',
                'balance' => 0,
                'status' => 'active',
            ],
            [
                'name' => 'Nurul Hidayah',
                'phone' => '081234567896',
                'address' => 'Jl. Perkebunan Sawit No. 34, Desa Harapan',
                'balance' => 0,
                'status' => 'active',
            ],
        ];

        foreach ($farmers as $farmer) {
            Farmer::create($farmer);
        }
    }
}
