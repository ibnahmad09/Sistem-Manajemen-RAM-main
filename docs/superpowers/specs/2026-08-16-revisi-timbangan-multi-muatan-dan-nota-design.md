# Revisi Timbangan — Multi-Muatan, Sesi Draft, dan Perbaikan Input — Design Doc

Tanggal: 2026-08-16
Status: Disetujui user (sesi brainstorming)

## Konteks

SISawit (Laravel 13 + Inertia v3 + React 19). Sistem penimbangan sawit saat ini
1 transaksi = 1 muatan = 1 nota. Ada 5 revisi dari user (kasir/super_admin):

1. Petani bisa ngantar buah lebih dari sekali timbang → **satu nota gabungan (multi-muatan)**.
2. Panah atas/bawah di input angka hilang (scroll mengubah angka).
3. Tambah NB di nota: "Harap hitung kembali Bang anda, kami tidak menerima komplain saat sudah keluar dari RAMP".
4. Nominal diinput berformat ribuan (1000000 → 1.000.000).
5. Harga 2580 tidak bisa disimpan (harus kelipatan 50) — root cause `step="50"` di `PalmPrices/Index.tsx:160`.

Tambahan dari sesi tanya-jawab:
- Sortiran dihitung **per muatan** (berat per muatan), harga sortir tetap 1 global.
- Harga sawit **satu harga untuk semua muatan** dalam 1 nota.
- RAM tidak pernah sepi → butuh **Sesi Timbangan (draft tersimpan di DB)** agar kasir tidak menunggu petani yang mengambil muatan lagi.
- Draft menggantung → dibatalkan **manual oleh kasir**.
- Muatan lama dalam draft **boleh dikoreksi** sebelum final.

## Keputusan Desain

### Sesi Timbangan (draft di DB)
- Transaksi dibuat sebagai `status=draft` saat "Simpan Draft" — tanpa nomor nota, tanpa sentuh hutang/kas.
- Muatan ditambah bertahap; muatan lama tampil dan boleh dikoreksi.
- "Selesai & Cetak" → `finalize`: generate nota number, potong hutang, catat cash entry, `status=printed`.
- 1 petani = 1 draft aktif; jika dipilih petani yang punya draft, form tampilkan banner resume.
- Section "Timbangan Berjalan" di halaman List untuk resume/batalkan.
- Endpoint: `PUT /weighing/{id}` (update draft), `POST /weighing/{id}/finalize`, `POST /weighing/{id}/cancel`.

### Multi-muatan
- Tabel baru `weighing_loads`: `weighing_transaction_id` FK cascade, `seq_no`, `gross_weight`, `tare_weight`, `initial_weight`, `deduction_weight`, `net_weight`, `has_sorting`, `sorting_weight`, `sorting_price_per_kg`, `sorting_total_amount`.
- Kolom agregat `weighing_transactions` menjadi TOTAL seluruh muatan (laporan lama tetap jalan).
- Backfill transaksi lama → 1 baris muatan.
- `WeighingTransaction::calculate()` di-refactor → `calculateLoads()`; versi lama jadi wrapper 1 muatan (angka identik).
- Hitungan per muatan: initial = gross − tare; deduction = initial × %; net = initial − deduction; sorting_total = sorting_weight × sorting_price. Total dijumlah; hutang + TOTAL DITERIMA + rounding dari total.

### Input numerik
- Komponen `CurrencyInput` (`type="text"`, `inputMode="numeric"`, format id-ID saat ketik, simpan angka mentah, pakai `parseNumber`).
- Ganti semua input rupiah: Form (harga sawit, harga sortir, bayar hutang), PalmPrices (hilangkan `step="50"`), CashFlow, Debts.
- CSS global hide spinner number input.
- Input berat (kg) tetap `type="number"` (spinner sudah hilang via CSS).

### Nota
- Baris per muatan (BRUTO / TARE / NETTO KOTOR / SORTIRAN), lalu total, hutang, TOTAL DITERIMA, tanda tangan, NB.
- Versi ESC/POS (`receipt-builder.ts`): lengkapi potongan & sortiran + NB dengan wrap 48 kolom.

## File yang Berubah

- `database/migrations/*_create_weighing_loads_table.php` (baru)
- `app/Models/WeighingLoad.php` (baru)
- `app/Models/WeighingTransaction.php`
- `app/Models/Farmer.php` (relasi)
- `app/Http/Controllers/WeighingTransactionController.php`
- `routes/web.php`
- `resources/css/app.css`
- `resources/js/components/currency-input.tsx` (baru)
- `resources/js/pages/Weighing/Form.tsx`
- `resources/js/pages/Weighing/List.tsx`
- `resources/js/pages/Weighing/Success.tsx`
- `resources/js/pages/PalmPrices/Index.tsx`
- `resources/js/pages/CashFlow/Index.tsx`
- `resources/js/pages/Debts/Index.tsx`
- `resources/js/lib/utils.ts`
- `resources/js/lib/receipt-builder.ts`
- `resources/js/types/domain.ts`

## Testing

- Feature tests (Pest): siklus draft (buat → tambah muatan → koreksi → finalize → nota/hutang/cash entry benar), validasi, single-load backward compat, backfill, cancel draft, total multi-muatan.
- `composer test` + `vendor/bin/pint --format agent` + `npm run lint && npm run types:check`.
