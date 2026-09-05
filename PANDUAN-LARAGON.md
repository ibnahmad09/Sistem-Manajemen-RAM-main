# Panduan Instalasi & Menjalankan SISAWIT di Laragon 6 (Windows)

Panduan ini untuk memasang dan menjalankan aplikasi **SISAWIT** (Sistem Manajemen RAM / manajemen kebun sawit: petani, timbang, harga TBS, utang, kas, laporan PDF & Excel) di komputer Windows yang memakai **Laragon versi 6.0.0** dengan Apache dan PHP bawaan.

> ⚠️ **Penting diketahui sejak awal:** Aplikasi ini membutuhkan **PHP 8.3+** dan **Node.js 20.19+**.
> Versi yang **bawaan** Laragon 6.0.0 (**PHP 8.1.10** dan **Node.js 18.8**) **belum cukup** — jadi ada 2 langkah sekali-sekali di awal (menambah PHP 8.4 dan Node 22). Langkah ini mudah dan tidak merusak pengaturan Laragon yang lain.

---

## 1. Persiapan: versi yang dibutuhkan vs bawaan Laragon 6.0.0

| Komponen | Dibutuhkan aplikasi | Bawaan Laragon 6.0.0 | Tindakan |
|---|---|---|---|
| PHP | 8.3+ (disarankan **8.4**) | 8.1.10 ❌ | **Wajib tambah PHP 8.4** (Langkah 3) |
| Node.js | 20.19+ / 22.12+ | 18.8 ❌ | **Wajib tambah Node 22** (Langkah 4) |
| Apache | 2.4.54 | 2.4.54 ⚠️ | Dipakai; tambah versi baru hanya jika error dengan PHP 8.4 (Langkah 5) |
| MySQL | 8.x | 8.0.30 ✅ | Tidak perlu diubah |
| Composer | 2.x | 2.4.1 ✅ | Tidak perlu diubah |

Proyek tidak perlu diubah sama sekali — semua yang dilakukan hanyalah menyiapkan lingkungan di komputer klien.

---

## 2. Mulai Laragon

1. Klik dua kali ikon Laragon di desktop untuk membuka jendela utamanya.
2. Klik tombol **Start All**.
3. Pastikan lampu indikator **Apache** dan **MySQL** menyala **hijau**.

---

## 3. Tambah PHP 8.4 (SEKALI SAJA)

1. Unduh PHP 8.4 untuk Windows dari: **https://windows.php.net/download**
   - Klik menu **Windows downloads** → pilih versi **PHP 8.4** (mis. 8.4.x).
   - Unduh file **"VS17 x64 Thread Safe"** (format `.zip`). Jangan pilih "Non Thread Safe".
2. Buat folder baru: `C:\laragon\bin\php\php-8.4-Win32-vs17-x64`
3. **Ekstrak seluruh isi** file zip ke dalam folder tersebut (isinya file `php.exe`, `php8ts.dll`, folder `ext`, dsb).
4. Klik **kanan** ikon Laragon di taskbar (area jam) → **PHP** → **Version** → pilih **8.4**.
5. Klik **Stop All** lalu **Start All** agar Apache memakai PHP yang baru.

> Klik kanan ikon Laragon → **PHP** → **php.ini** untuk memeriksa ekstensi. Pastikan baris berikut **tidak** diawali tanda `;` (dihapus komentarnya):
> `extension=curl`, `extension=fileinfo`, `extension=gd`, `extension=mbstring`, `extension=openssl`, `extension=pdo_mysql`, `extension=zip`
> Jika ada yang masih diawali `;`, hapus tanda `;`-nya, simpan, lalu **Stop All → Start All**.

---

## 4. Tambah Node.js 22 (SEKALI SAJA)

1. Unduh Node.js dari: **https://nodejs.org/en/download** → pilih **Node 22 LTS** → **Windows 64-bit** dalam format **.zip** (bukan installer .msi).
2. Ekstrak file zip ke dalam `C:\laragon\bin\nodejs\`, sehingga muncul folder bernama `node-v22.x-win-x64`.
3. Klik **kanan** ikon Laragon → **Node.js** → **Version** → pilih versi **22**.
4. (Disarankan) Klik kanan ikon Laragon → **Tools** → **PATH** → **Add Laragon to PATH**, agar perintah `composer` dan `npm` bisa dipakai di CMD / PowerShell biasa. Restart terminal yang sudah terbuka.

---

## 5. (Khusus jika Apache error) Tambah Apache versi baru

Kalau setelah mengganti PHP ternyata **Apache tidak bisa start** atau halaman web error 500 / tidak membuka, berarti Apache bawaan (2.4.54) tidak cocok dengan PHP 8.4. Solusinya menambah Apache versi baru (VS17):

1. Unduh Apache dari **https://apachelounge.com/download/** → **httpd-2.4.6x-win64-VS17.zip**.
2. Ekstrak ke `C:\laragon\bin\apache\`, lalu **rename folder** hasil ekstrak (semula `Apache24`) menjadi mis. `httpd-2.4.62-win64-VS17` (diawali `httpd-`, tanpa spasi).
3. Klik **kanan** ikon Laragon → **Apache** → **Version** → pilih versi baru tersebut.
4. **Stop All → Start All**.
5. Pastikan pasang **Microsoft Visual C++ Redistributable 2015-2022 (x64)** jika belum ada (diunduh dari situs resmi Microsoft).

Jika tetap bermasalah, gunakan Metode B di Langkah 9 (tanpa Apache) — aplikasi tetap berjalan normal.

---

## 6. Verifikasi versi (cara cepat)

1. Buka jendela utama Laragon → klik tombol **Terminal**.
2. Jalankan perintah berikut satu per satu dan pastikan hasilnya sesuai:

```
php -v        → harus PHP 8.4.x
node -v       → harus v22.x
composer -V   → harus Composer 2.x
```

---

## 7. Letakkan proyek di folder `www`

1. Buka folder `C:\laragon\www\`.
2. Buat folder baru bernama **`sisawit`** (nama menentukan alamat situs: `sisawit.test` — hindari spasi/karakter khusus).
3. **Salin seluruh isi** folder proyek (semua file di dalamnya, bukan folder pembungkusnya) ke `C:\laragon\www\sisawit\`.
4. Jangan menghapus atau mengubah file apa pun saat menyalin.

---

## 8. Buat database MySQL

1. Buka **HeidiSQL**: jalan `C:\laragon\bin\heidiSQL\heidiSQL.exe` (atau cari "HeidiSQL" dari menu Laragon).
2. Klik **New** → isi: Host `127.0.0.1`, User `root`, Password **dikosongkan** → **Open**.
3. Klik kanan pada koneksi → **Create new** → **Database**:
   - Name: `sisawit`
   - Charset: `utf8mb4` — Collation: `utf8mb4_unicode_ci`
4. Klik **Save / OK** hingga database `sisawit` muncul.

> Alternatif: lewat menu Laragon **Tools → Quick add → phpMyAdmin**, lalu buka `http://localhost/phpmyadmin` (login `root`, password kosong).

---

## 9. Instal dependensi & atur file `.env`

Buka **Terminal Laragon** dan jalankan di dalam folder proyek:

```
cd C:\laragon\www\sisawit
composer install
```

Kemudian buat file `.env` (dari contoh bawaan proyek):

```
copy .env.example .env
```

Buka file `.env` dengan Notepad dan ubah bagian database menjadi seperti ini (hapus tanda `#` pada baris yang masih dikomentari):

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sisawit
DB_USERNAME=root
DB_PASSWORD=
```

Sesuaikan juga alamat aplikasi:
- Jika akses lewat Apache (`http://sisawit.test`): `APP_URL=http://sisawit.test`
- Jika akses lewat server bawaan PHP (Metode B): `APP_URL=http://localhost`

Lanjutkan di terminal yang sama:

```
php artisan key:generate
npm install
```

> Catatan: folder proyek berisi file `.npmrc` yang menonaktifkan skrip instalasi npm — ini normal dan aman. Komponen biner (esbuild, Tailwind, LightningCSS) sudah disediakan langsung untuk Windows.

---

## 10. Migrasi database & isi data awal

```
php artisan migrate --seed
```

Perintah ini membuat seluruh tabel (termasuk tabel untuk sesi, cache, dan antrian — ketiganya memakai database) sekaligus mengisi **data awal**: akun demo, petani, dan harga TBS.

---

## 11. Siapkan tampilan (frontend)

Pilih salah satu cara:

**Metode A — Untuk penggunaan biasa (paling sederhana):**

```
npm run build
```

Setelah ini selesai (beberapa menit), aplikasi siap diakses lewat Apache.

**Metode B — Untuk pengembangan (perubahan frontend tampil otomatis):**

```
composer run dev
```

Perintah ini menjalankan 3 proses sekaligus: server aplikasi (port 8000), antrian pekerja (queue), dan server Vite. **Biarkan jendela terminal ini tetap terbuka** selama aplikasi dipakai — jika tertutup, antrian transaksi berhenti.

---

## 12. Akses aplikasi

| Metode | Alamat |
|---|---|
| A (Apache) | **http://sisawit.test** (pastikan Apache hijau di Laragon) |
| B (server bawaan) | **http://127.0.0.1:8000** |

Laragon otomatis mengarahkan `sisawit.test` ke folder `public/` milik aplikasi (tidak perlu konfigurasi tambahan). Jika `sisawit.test` tidak terbuka, cek Langkah 5 / bagian Penanganan Masalah.

### Akun login percobaan (dari seeder bawaan proyek)

| Peran | Email | Kata sandi |
|---|---|---|
| Super Admin (pengelola penuh) | `admin@sisawit.com` | `password` |
| Kasir (operasional timbang/bayar) | `kasir@sisawit.com` | `password` |
| Owner (laporan saja) | `owner@sisawit.com` | `password` |

> 🔐 **Segera ganti kata sandi** akun-akun ini setelah berhasil login (menu pengaturan profil), karena kata sandinya sudah diketahui umum.

---

## Penanganan Masalah (Troubleshooting)

| Gejala | Kemungkinan penyebab & solusi |
|---|---|
| `php -v` masih menampilkan 8.1 | Belum mengganti versi: klik kanan ikon Laragon → **PHP → Version** → pilih 8.4, lalu **Stop All → Start All**. |
| Apache tidak bisa start / lampu merah setelah ganti PHP | Apache bawaan tidak cocok dengan PHP 8.4. Ikuti **Langkah 5** (tambah Apache VS17). Sementara itu bisa pakai Metode B. |
| Halaman web kosong / "Vite manifest" / aset CSS tidak muncul | `npm run build` belum dijalankan, atau proses `composer run dev` (Vite) tidak berjalan. Jalankan perintah yang sesuai. |
| `SQLSTATE[HY000] [1045] Access denied` saat migrate | Kredensial MySQL di `.env` salah. Pastikan `DB_USERNAME=root`, `DB_PASSWORD=` (kosong), `DB_DATABASE=sisawit`, dan MySQL berstatus hijau di Laragon. |
| `http://sisawit.test` tidak bisa dibuka | Pastikan Apache hijau → **Stop All → Start All**. Cek isi `C:\Windows\System32\drivers\etc\hosts` — harus ada baris `127.0.0.1 sisawit.test` (ditambahkan otomatis oleh Laragon). Jika tetap gagal, pakai Metode B `http://127.0.0.1:8000`. |
| `composer` / `npm` tidak dikenali di CMD atau VS Code | Pakai **Terminal Laragon**, atau klik kanan ikon Laragon → **Tools → PATH → Add Laragon to PATH**, lalu buka ulang terminalnya. |
| Error saat `npm install` / `npm run build` terkait binary (esbuild, lightningcss, tailwind oxide) | Hapus folder `node_modules`, lalu jalankan: `npm install --ignore-scripts=false` (sekali saja), kemudian `npm run build` lagi. |
| Port 8000 sudah dipakai program lain | Gunakan port lain untuk sementara: `php artisan serve --port=8001`, buka `http://127.0.0.1:8001`. |
| Transaksi/nota menggantung | Antrian (queue) tidak berjalan — pastikan proses `composer run dev` (atau `php artisan queue:work`) tetap terbuka di terminal. |
| Error 500 / halaman tidak termuat saat via Apache, tapi berfungsi di 127.0.0.1:8000 | Apache tidak berhasil memuat PHP 8.4. Ikuti **Langkah 5** (tambah Apache VS17). |

---

## Ringkasan Perintah (Cheat Sheet)

Urutan lengkap sekali jalan (jalankan dari **Terminal Laragon** di folder proyek):

```bash
cd C:\laragon\www\sisawit
composer install
copy .env.example .env        # lalu edit .env: DB_* mysql/sisawit/root/kosong
php artisan key:generate
npm install
php artisan migrate --seed
npm run build                 # ATAU: composer run dev (mode pengembangan, terminal dibiarkan terbuka)
```

Akses: **http://sisawit.test** (Apache) atau **http://127.0.0.1:8000** (server bawaan).

---

## Catatan Penting

- File `.env` berisi kunci rahasia aplikasi — **jangan dibagikan** dan jangan ikut disalin ke tempat lain.
- Seluruh proses di atas **tidak mengubah kode proyek**; yang diubah hanya file `.env` (hasil salinan), `vendor/`, `node_modules/`, dan database — semuanya pengaturan lokal di komputer klien.
- Jika komputer klien hanya memakai Apache bawaan dan PHP 8.4 sukses dimuat (tidak ada error), **Langkah 5 tidak perlu dilakukan**.
- Untuk pemakaian harian yang stabil, cara termudah adalah: **Start All** di Laragon → buka Terminal Laragon → `cd C:\laragon\www\sisawit` → `composer run dev` → buka `http://127.0.0.1:8000`. Terminal dibiarkan terbuka selama aplikasi dipakai.