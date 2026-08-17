# Laporan — Export PDF, Excel, dan Perbaikan Cetak — Design Doc

Tanggal: 2026-08-17
Status: Disetujui user (sesi brainstorming)

## Konteks

SISawit (Laravel 13 + Inertia v3 + React 19). Fitur Laporan (`/reports`) sudah ada tapi hanya bisa cetak via `window.print()`. User meminta:

1. Tampilan cetak (print) yang lebih rapi dan terbaca oleh user.
2. Export ke format Excel (.xlsx).
3. Export ke format PDF (tombol Download PDF, server-side via dompdf).

Saat ini project tidak memiliki package PDF atau Excel — perlu diinstall.

## Keputusan Desain

### Backend — Export routes

Dua route baru, di dalam auth middleware (bukan Inertia):

```
GET /reports/export/pdf    → ReportsController@exportPdf
GET /reports/export/excel  → ReportsController@exportExcel
```

Query builder yang sama seperti `index()`: `WeighingTransaction::where('is_latest_version', true)->where('status', '!=', 'draft')` + filter `date_start`/`date_end` dari query param. Data dikirim langsung sebagai binary response (bukan JSON).

### PDF — barryvdh/laravel-dompdf

- `composer require barryvdh/laravel-dompdf`
- View Blade: `resources/views/reports/pdf.blade.php`
- Format: tabel dengan kolom — No. Nota, Tanggal, Petani, Kasir, Berat Bersih (kg), Total Bruto (Rp), Bayar Hutang (Rp), Diterima (Rp)
- Header: judul "LAPORAN TRANSAKSI TIMBANGAN SAWIT", sub-judul perusahaan (dari `config('app.name')`), periode tanggal (date_start — date_end)
- Footer: baris TOTAL (total berat, total bruto, total hutang terbayar, total diterima), tanggal cetak
- Orientasi: landscape A4

### Excel — maatwebsite/excel

- `composer require maatwebsite/excel`
- Export class: `app/Exports/ReportsExport.php`
- Implement `FromCollection` + `WithHeadings` + `WithMapping` + `WithStyles`
- Sheet name: "Laporan Keuangan"
- Baris header: kolom yang sama dengan tabel
- Data rows: format angka id-ID (ribuan + "Rp" prefix untuk rupiah, suffix "kg" untuk berat)
- Baris terakhir: TOTAL (dihitung manual di export class)

### Frontend — Toolbar dropdown

Tombol "Cetak Laporan" diganti jadi dropdown menggunakan `@headlessui/react` `Menu` (sudah ada di project). Isi dropdown:

- **Cetak (Print)** — `window.print()`, hanya tampil setelah ada data
- **Download PDF** — buka `/reports/export/pdf?date_start=...&date_end=...` di tab baru
- **Download Excel** — buka `/reports/export/excel?date_start=...&date_end=...` di tab baru

Ketiga opsi hanya muncul saat `summary` ada (ada data hasil generate).

### Frontend — Print CSS perbaikan

Perubahan `@media print` di `Reports/Index.tsx`:

- `nav, aside` → `display: none`
- `.print\:hidden` → `display: none`
- `body` → `font-size: 11px; margin: 0;`
- `table` → `font-size: 10px; border-collapse: collapse`
- Tabel cetak: border solid 1px, header berwarna abu-abu, angka rapi kanan
- `.print:block` → tampilkan header laporan (judul, perusahaan, periode) saat cetak

### ReportsController — Refactor shared query

Ekstrak query builder ke private method `applyReportFilters(Request $request)` untuk dipanggil oleh ketiga method (`index`, `exportPdf`, `exportExcel`):

```php
private function applyReportFilters(Request $request)
{
    $query = WeighingTransaction::where('is_latest_version', true)
        ->where('status', '!=', 'draft')
        ->orderBy('transaction_date', 'desc');

    if ($request->filled('date_start')) {
        $query->whereDate('transaction_date', '>=', $request->date_start);
    }
    if ($request->filled('date_end')) {
        $query->whereDate('transaction_date', '<=', $request->date_end);
    }

    return $query->get();
}
```

## File yang Berubah

### Baru
- `app/Exports/ReportsExport.php`
- `resources/views/reports/pdf.blade.php`

### Diubah
- `app/Http/Controllers/ReportsController.php` — tambah `exportPdf`, `exportExcel`, refactor `applyReportFilters`
- `routes/web.php` — tambah 2 route export
- `resources/js/pages/Reports/Index.tsx` — dropdown toolbar + perbaikan print CSS
- `composer.json` — 2 package baru
- `tests/Feature/WeighingTransactionTest.php` — 2 test baru (PDF, Excel export)

## Testing

- `reports export pdf returns valid PDF` — `GET /reports/export/pdf?date_start=...&date_end=...` → status 200, Content-Type `application/pdf`
- `reports export excel returns valid XLSX` — `GET /reports/export/excel?date_start=...&date_end=...` → status 200, Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `composer test` + `vendor/bin/pint --format agent` + `npm run lint && npm run types:check`
