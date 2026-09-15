# weighing-history-search-nama-petani - Work Plan (DRAFT)

Status: awaiting-approval
Intent: clear
Review required: no

## TL;DR (For humans)

**What you'll get** — 3 fitur di halaman Riwayat Timbangan (`/weighing`):

1. **Pencarian nama petani** — input teks (bukan dropdown) untuk filter transaksi by nama petani (LIKE search), kombinasi dengan filter tanggal, tetap aktif saat paginasi.
2. **Edit (Revisi)** — tombol Edit per baris → halaman form yang sudah terisi → simpan = buat NOTA BARU (nomor baru), nota lama diarsipkan (`status='revised'`, tidak lagi tampil di riwayat), plus reversi otomatis + pembuatan ulang jurnal keuangan (cash entry & hutang petani) agar saldo kasir & petani TETAP BENAR. Ada field "Alasan Revisi" wajib.
3. **Hapus (Batal)** — tombol Hapus per baris → konfirmasi → transaksi di-set `status='cancelled'` + `is_latest_version=false` (hilang dari riwayat/laporan, row tetap ada), plus jurnal pembalik (cash entry negatif + hutang negatif) sehingga saldo kasir & petani otomatis dikembalikan.

**Why these mechanics** — Transaksi final punya efek keuangan nyata: `CashierCashEntry` (farmer_payment = kasir mengeluarkan uang) dan `FarmerDebt` (payment = saldo petani berkurang), dan `farmer->syncBalance()` dijalankan saat finalisasi. Menghapus/merubah tanpa koreksi = saldo kasir & petani salah. Reversal memakai **entry bertanda negatif dengan type SAMA** (`farmer_payment` / `payment` negatif) — cara ini bekerja dengan semua query balance yang sudah ada (`CashFlowController:42-43`, `DashboardController:84-89`: balance = Σcash_in − Σ(expense+farmer_payment); `Farmer::calculateDebtBalance`: payment mengurangi, negatif = menambah) — **TANPA migrasi** (enum tidak diubah). Mekanisme revisi (`revision_of`, `revision_number`, `revision_reason`, status `revised`) SUDAH ADA di schema & model (`WeighingTransaction.php:105-119`, migration `:59-63`) tapi belum pernah dipakai — plan ini mengaktifkannya.

**What it will NOT do** — Tidak edit-in-place (audit trail tetap utuh); tidak hard delete (tidak ada migration baru; row tetap ada); tidak mengubah route/hak akses (super_admin + cashier sesuai jawaban user); tidak menambah dependency; tidak mengubah fitur lain (reports, debts, dashboard, cash-flow, draft flow lama `update()` untuk draft tidak berubah).

**Effort** — Sedang. 11 todos + 1 wave final verification. Area berisiko: logika reversal keuangan (dikunci oleh feature test baru + 122+ test existing sebagai regression net) dan retasan `update()`/`cancel()` (percabangan draft vs final, draft flow existing TIDAK disentuh).

## Decisions (dari jawaban user)

1. **Edit = Revisi** (nota baru + arsip lama) — user memilih opsi revisi.
2. **Hapus = Batal + reversal keuangan** — user memilih batal + jurnal pembalik.
3. **Izin = super_admin DAN cashier** — user memilih keduanya; route group existing `role:super_admin,cashier` sudah mencakup; TIDAK ada role gating baru.
4. Reversal memakai type existing (`farmer_payment` negatif, `payment` negatif) — tanpa migrasi; dipilih karena balance query existing menjumlahkan SEMUA entry tanpa filter is_latest_version (sudah diverifikasi di CashFlowController/DashboardController).
5. Nota revisi mendapat NOMOR BARU via `generateNotaNumber` (sequence = jumlah transaksi non-draft pada tanggal transaksi; nota lama yg sudah 'revised' ikut terhitung — konsisten dengan finalizeDraft).
6. `revision_reason` wajib diisi saat revisi (validasi di branch revisi, bukan di `validatedData` — agar draft flow tidak tersentuh).
7. `buildInitialWeighingFormState` menerima `draft: WeighingTransaction | null` — untuk edit, Form melempar `transaction` lewat param yang sama (shape sama; `loads` wajib eager-load di `edit()`).

## Current state (sudah terpasang di disk, dari percobaan select sebelumnya — HARUS DIBERSIHKAN)

- `WeighingTransactionController.php`: `paginate(20)->withQueryString()` ✅ (dipakai); `$farmers = Farmer::orderBy('name','asc')->get(['id','name'])` + `'farmers' => $farmers` ✅ (HAPUS — diganti search input); block filter masih `farmer_id` (GANTI → `farmer_name`); `'filters' => $request->only(['farmer_id',...])` (GANTI → `farmer_name`).
- `List.tsx`: Props `farmers: Pick<Farmer,'id'|'name'>[]` (HAPUS); destructure `farmers` (HAPUS); state `farmerId` (GANTI → `farmerName`); `<select>` dropdown (GANTI → `<input type="text">`); `applyFilter` kirim `farmer_id` (GANTI → `farmer_name`).

## Scope

**In scope**:
- `app/Http/Controllers/WeighingTransactionController.php` — index search `farmer_name`; hapus `$farmers`/prop; `edit()` baru; `update()` branch revisi; `cancel()` branch void; helper reversal keuangan + createFinancialEntries; route `weighing.edit` ditambahkan.
- `routes/web.php` — resource weighing `except(['edit','destroy'])` → `except(['destroy'])`.
- `resources/js/pages/Weighing/List.tsx` — search input petani; kolom Aksi + tombol "Edit" (Link edit) dan "Hapus" (confirm → POST cancel); Reset menampilkan kondisi `filters.farmer_name`.
- `resources/js/pages/Weighing/Form.tsx` — prop `transaction`; form dibangun dari `transaction ?? draft`; banner revisi; textarea "Alasan Revisi" saat revisi; submit `put(update(transaction.id))`; judul "Revisi Nota #…".
- `resources/js/lib/weighing-form.ts` — tambah `revision_reason: ''` ke initial state.
- `tests/Feature/WeighingRevisionVoidTest.php` (BARU) — revisi & void + guards + reversal financial.
- `tests/JS/weighing-form.test.ts` — update assertion shape (revision_reason).
- `tests/e2e/weighing.spec.ts` — test edit (revisi) & hapus (void) di riwayat.

**Out of scope / Must NOT**:
- JANGAN migrasi baru (reversal pakai type existing, negatif).
- JANGAN ubah `validatedData()`/`store()`/`finalize()`/`create()`/`show()` flow draft.
- JANGAN respons `update()` untuk draft diubah (percabangan: draft → kode lama verbatim).
- JANGAN ubah query balance (CashFlow/Dashboard) — reversal dirancang agar kompatibel.
- JANGAN ubah role middleware (`role:super_admin,cashier`).
- JANGAN menambah dependency baru (npm/composer).
- JANGAN hard delete / `weighing.destroy`.
- JANGAN menghapus/men-disable test existing.
- JANGAN ubah tampilan Share/Nota page (bukan bagian request).

## Verification strategy

- Red-to-green feature test: tulis `WeighingRevisionVoidTest` sebelum implementasi branch revisi/void (RED — route belum ada / tidak ada reversal), implementasi, GREEN.
- Regression: `composer test` penuh (122+ test existing) + `npm run test:js`.
- Frontend gates: `npm run types:check`, `npm run lint` (routes wajib di-regenerate dulu via `npm run dev`/`npm run build` karena `weighing.edit` baru → wayfinder).
- E2E: `composer run test:e2e` dijalankan sesuai konvensi proyek (2 server, seed E2eSeeder/E2eEmptyStateSeeder).
- Pint: `vendor/bin/pint --dirty --format agent` → passed.

## Todos

- [ ] 1. Backend `index()` — ganti filter `farmer_id` → `farmer_name` (LIKE via whereHas), hapus `$farmers` + prop, update `filters`
  What to do / Must NOT do: (a) Ganti block:
  ```php
  // Filter by farmer
  if ($request->has('farmer_id')) {
      $query->where('farmer_id', $request->farmer_id);
  }
  ```
  menjadi:
  ```php
  // Filter by farmer name search
  if ($request->filled('farmer_name')) {
      $query->whereHas('farmer', function ($q) use ($request) {
          $q->where('name', 'like', '%'.$request->farmer_name.'%');
      });
  }
  ```
  (b) Hapus `$farmers = Farmer::orderBy('name', 'asc')->get(['id', 'name']);`. (c) Hapus `'farmers' => $farmers,` dari props. (d) `'filters'` → `$request->only(['farmer_name', 'date_start', 'date_end'])`. MUST NOT: ubah filter tanggal, summary, `paginate(20)->withQueryString()`, method lain.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2
  References: `WeighingTransactionController.php:28-31` (block), `:56` ($farmers), `:62-63` (props/filters); `WeighingTransaction.php:84` (relasi farmer)
  Acceptance: Tidak ada `farmer_id`/`$farmers`/`'farmers'` di `index()`; `GET /weighing?farmer_name=Su` memfilter petani name LIKE %Su%.
  QA scenarios: (happy) HTTP GET `/weighing?farmer_name=Su` → hanya transaksi petani cocok; (failure) `?farmer_name=` kosong → semua muncul (pakai `filled`). Evidence `.omo/evidence/weighing-history-search-nama-petani/task-1-controller.md` (diff).
  Commit: N (squash final)

- [ ] 2. Frontend `List.tsx` — search input teks nama petani; rename state `farmerId` → `farmerName`; hapus `farmers`
  What to do / Must NOT do: (a) Props: hapus `farmers: Pick<Farmer, 'id' | 'name'>[];`, `filters.farmer_id?` → `filters.farmer_name?`. (b) Destructure: hapus `farmers,`. (c) State: `const [farmerName, setFarmerName] = useState(filters.farmer_name ?? '');`. (d) `applyFilter`: `if (farmerName) params.farmer_name = farmerName;`. (e) `clearFilter`: `setFarmerName('')`. (f) Ganti block `<select value={farmerId}>…{farmers.map…}</select>` menjadi:
  ```tsx
  <input
      type="text"
      value={farmerName}
      onChange={(e) => setFarmerName(e.target.value)}
      placeholder="Cari nama petani..."
      onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
      className="h-9 w-48 rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
  />
  ```
  (g) Kondisi tombol Reset: tambah `|| filters.farmer_name`. MUST NOT: ubah input tanggal, summary, table, pagination.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: —
  References: `List.tsx:19-28, 45-54, 56-71, 198-229` (block filter)
  Acceptance: Tidak ada `farmerId`/`farmers.map` tersisa; tsc pass; Enter memicu applyFilter.
  QA: `npm run types:check` exit 0; manual render input text. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-2-list-search.md` (diff).
  Commit: N (squash final)

- [ ] 3. Route — tambah `edit` kembali ke resource weighing
  What to do / Must NOT do: Di `routes/web.php`, ubah `Route::resource('weighing', WeighingTransactionController::class)->except(['edit', 'destroy']);` → `->except(['destroy']);`. MUST NOT: sentuh route lain; jangan ubah urutan (komentar "Must be before resource route" untuk `weighing/success` tetap di tempat). Setelah ini, regenerate route TS (wayfinder) sebelum todo 8-10: jalankan `npm run dev` (atau `npx vite build` sekali) dan pastikan `resources/js/routes/weighing.ts` punya `edit`.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 4, 8
  References: `routes/web.php:53-59`; AGENTS.md (wayfinder auto-generated)
  Acceptance: `php artisan route:list --name=weighing.edit` menampilkan route GET; `resources/js/routes/weighing.ts` punya function `edit`.
  QA: `php artisan route:list --path=weighing` → muncul `weighing/edit`; grep `export function edit` di `resources/js/routes/weighing.ts`. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-3-route.md`.
  Commit: N (squash final)

- [ ] 4. Backend `edit()` — render Form dengan `transaction`
  What to do / Must NOT do: Tambah method publik:
  ```php
  public function edit(WeighingTransaction $weighing)
  {
      abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 404, 'Transaksi tidak dapat direvisi.');

      $weighing->load(['farmer', 'loads']);

      $farmers = Farmer::where('status', 'active')->orWhere('id', $weighing->farmer_id)
          ->orderBy('name', 'asc')->get();
      $latestPrice = PalmPrice::getLatestPrice();
      $deductionConfig = DeductionConfig::getActiveConfig();

      return Inertia::render('Weighing/Form', [
          'transaction' => $weighing,
          'farmers' => $farmers,
          'latestPrice' => $latestPrice,
          'deductionConfig' => $deductionConfig,
          'roundingMode' => 'none',
      ]);
  }
  ```
  MUST NOT: ubah `create()`; jangan render prop `draft` (pakai `transaction`).
  Parallelization: Wave 1 | Blocked by: 3 | Blocks: 5, 7
  References: `WeighingTransactionController.php:67-96` (create pola); `Weighing/Form.tsx:39-46` (Props)
  Acceptance: GET `/weighing/{id}/edit` render Form dengan prop `transaction` berisi loads.
  QA: `php artisan test --compact --filter=WeighingRevisionVoidTest` → test "edit page renders transaction" GREEN (lihat todo 9). Evidence `.omo/evidence/weighing-history-search-nama-petani/task-4-edit-method.md`.
  Commit: N (squash final)

- [ ] 5. Backend `update()` — branch revisi untuk transaksi final + helper reversal keuangan + `createFinancialEntries()`
  What to do / Must NOT do: (a) Refactor kecil: ekstrak isi `finalizeDraft` baris 553-579 (FarmerDebt + CashierCashEntry + syncBalance) ke private method baru `createFinancialEntries(WeighingTransaction $transaction, Farmer $farmer, $user, array $validated): void` VERBATIM (tanpa generateNotaNumber/update status), lalu panggil dari `finalizeDraft` — regression 100% dikunci oleh test existing (`WeighingTransactionTest`, `CashFlowTest`, `FarmerDebtBindingTest`, `DebtExceedsGrossTest`). (b) Tambah helper:
  ```php
  private function reverseTransactionFinancials(WeighingTransaction $transaction, $user): void
  {
      $farmer = $transaction->farmer;
      $today = now()->format('Y-m-d');

      CashierCashEntry::create([
          'cashier_id' => $transaction->cashier_id,
          'cashier_name_snapshot' => $transaction->cashier_name_snapshot,
          'type' => 'farmer_payment',
          'amount' => -1 * (float) $transaction->final_paid_amount_rounded,
          'payment_method' => $transaction->payment_method,
          'category' => 'bayar_petani',
          'description' => 'Pembatalan Nota #'.$transaction->nota_number,
          'transaction_id' => $transaction->id,
          'entry_date' => $today,
          'created_by' => $user->id,
      ]);

      if ((float) $transaction->debt_paid_amount > 0) {
          FarmerDebt::create([
              'farmer_id' => $transaction->farmer_id,
              'farmer_name_snapshot' => $transaction->farmer_name_snapshot,
              'type' => 'payment',
              'amount' => -1 * (float) $transaction->debt_paid_amount,
              'debt_date' => $today,
              'description' => 'Pembatalan Nota #'.$transaction->nota_number,
              'transaction_id' => $transaction->id,
              'created_by' => $user->id,
          ]);
      }
  }
  ```
  (c) Di `update()`, setelah blok `if ($weighing->status !== 'draft')` SAAT INI (yang reject), ganti reject jadi branch revisi:
  1. `abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 422, 'Hanya transaksi final terbaru yang bisa direvisi.');`
  2. `$request->validate(['revision_reason' => 'required|string|max:255']);`
  3. `$action = 'finalize'` (paksa; abaikan input action)
  4. Hitung `$currentDebt = $farmer->calculateDebtBalance();` + `$calculation = $this->calculate(...)` + guard `debt_paid_amount <= gross_total_amount` (sama seperti draft branch).
  5. Arsip lama: `$weighing->update(['is_latest_version' => false, 'status' => 'revised', 'cashier_balance_deducted' => false]);`
  6. Buat row baru: `$txn = new WeighingTransaction;` → `$this->fillTransactionData($txn, $farmer, $user, $validated, $loads, $calculation, $currentDebt, 'finalize');` → lalu set revision fields + status:
  ```php
  $txn->status = 'printed';
  $txn->printed_at = now();
  $txn->is_latest_version = true;
  $txn->cashier_balance_deducted = true;
  $txn->revision_of = $weighing->id;
  $txn->revision_number = $weighing->revision_number + 1;
  $txn->revision_reason = $request->revision_reason;
  $txn->save();
  ```
  7. `$this->storeLoads($txn, $loads, $calculation);`
  8. `$this->reverseTransactionFinancials($weighing, $user);` — SEBELUM generate nota number (agar counter menganggap old masih menempati slot — old sudah 'revised' = non-draft).
  9. Generate nota: `$today = new \DateTime($validated['transaction_date']); $seq = WeighingTransaction::whereDate('transaction_date', $today->format('Y-m-d'))->where('status','!=','draft')->where('id','!=',$txn->id)->count(); $nota = WeighingTransaction::generateNotaNumber($today, $seq + 1); $txn->update(['nota_number' => $nota]);`
  10. `$this->createFinancialEntries($txn, $farmer, $user, $validated);`
  11. Commit → `redirect()->route('weighing.success', ['nota' => $nota])->with('success', 'Nota direvisi. Nota baru: '.$nota.'.');`
  MUST NOT: ubah logika branch draft (`status === 'draft'`) — pindahkan/hapus `if ($weighing->status !== 'draft') { rollback; return errors; }` HANYA untuk final branch; jangan ubah `store()`; jangan ubah `validatedData()`; jangan ubah `calculate()`.
  Parallelization: Wave 1 | Blocked by: 4 | Blocks: 8, 9
  References: `WeighingTransactionController.php:166-223` (update), `:535-580` (finalizeDraft), `:509-530` (storeLoads), `WeighingTransaction.php:310` (generateNotaNumber), migration `:58-63` (revision fields), `Farmer.php:43-55` (calculateDebtBalance)
  Acceptance: PUT `/weighing/{id}` (printed, latest) + `revision_reason` → row baru status printed/revision_of/revision_number+1; row lama status revised + is_latest false + cashier_balance_deducted false; cash entries: reversal (-old) + baru (+new); debt: reversal (-old debt_paid) + baru (jika >0); balance farmer benar (net = hanya debt_paid baru); redirect success nota baru.
  QA scenarios: (happy) session test PUT lengkap → assert DB; (failure) tanpa revision_reason → 422; PUT ke row non-latest → 422; debt_paid > gross → guard error. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-5-update-revision.md`.
  Commit: N (squash final)

- [ ] 6. Backend `cancel()` — branch void untuk transaksi final (batal + reversal)
  What to do / Must NOT do: Di `cancel()`, ganti `abort_unless($weighing->status === 'draft', 422, …);` + update dibawahnya menjadi branch:
  ```php
  public function cancel(WeighingTransaction $weighing)
  {
      $user = request()->user();

      if ($weighing->status === 'draft') {
          $weighing->update([
              'status' => 'cancelled',
              'is_latest_version' => false,
          ]);

          return back()->with('success', 'Draft dibatalkan.');
      }

      abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 422, 'Hanya transaksi final terbaru yang bisa dibatalkan.');

      DB::beginTransaction();
      try {
          $this->reverseTransactionFinancials($weighing, $user);
          $weighing->update([
              'status' => 'cancelled',
              'is_latest_version' => false,
              'cashier_balance_deducted' => false,
          ]);
          $weighing->farmer->syncBalance();
          DB::commit();
      } catch (\Exception $e) {
          DB::rollBack();
          return back()->withErrors(['error' => 'Gagal membatalkan transaksi: '.$e->getMessage()]);
      }

      return back()->with('success', 'Transaksi dibatalkan. Saldo kasir & petani dikoreksi otomatis.');
  }
  ```
  MUST NOT: ubah branch draft (verbatim); jangan libatkan `weighing.destroy`; jangan hapus row.
  Parallelization: Wave 1 | Blocked by: 5 (helper `reverseTransactionFinancials`) | Blocks: 8, 9
  References: `WeighingTransactionController.php:306-316` (cancel saat ini)
  Acceptance: POST `/weighing/{id}/cancel` (printed, latest) → status cancelled, is_latest false, cashier_balance_deducted false, 1 cash entry reversal negatif, 1 debt reversal negatif (jika debt_paid > 0), balance farmer terkoreksi; `GET /weighing` tidak lagi menampilkan row (is_latest=false).
  QA: (happy) POST pada printed → assert DB entries + balance; (failure) POST pada draft → branch lama (tidak ada reversal); POST pada non-latest → 422. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-6-cancel-void.md`.
  Commit: N (squash final)

- [ ] 7. Frontend `Form.tsx` — prop `transaction` + banner revisi + textarea alasan revisi + submit ke update
  What to do / Must NOT do: (a) `interface Props` tambah `transaction?: WeighingTransaction | null;` dan destructure `transaction = null`. (b) `const form = useForm(buildInitialWeighingFormState({ draft: transaction ?? draft, latestPrice, deductionConfig }));` (c) `submit(action)`:
  ```tsx
  const submit = (action: 'save_draft' | 'finalize') => {
      actionRef.current = action;
      if (transaction) put(weighingRoute.update(transaction.id).url);
      else if (draft) put(weighingRoute.update(draft.id).url);
      else post(weighingRoute.store().url);
  };
  ```
  (d) `isEditingDraft = !!draft` — biarkan; TAMBAH `isRevising = !!transaction`. (e) Judul: jika `isRevising` → `Revisi Nota #{transaction?.nota_number}`; subtitle tetap. (f) Banner biru draft hanya jika `draft` (✓ sudah dikondisikan `isEditingDraft`); TAMBAH banner revisi (ungu/blue) jika `isRevising`: "Merevisi nota #X milik Y. Perubahan akan membuat nota BARU dan mengarsipkan nota lama." (g) TAMBAH field "Alasan Revisi" (textarea, required) — render hanya jika `isRevising`, dengan `setData('revision_reason', ...)`. (h) Tombol submit: teks "Revisi & Cetak Nota Baru" saat `isRevising`. (i) `fetchDebt` effect: saat ini `if (draft)` → ganti kondisi `if (draft || transaction)` (call fetchDebt dengan `transaction.farmer_id`). MUST NOT: ubah layout form utama/muatan/kalkulasi; jangan ubah jenis render untuk draft; jangan sentuh lib selain todo 8.
  Parallelization: Wave 1 | Blocked by: 4 | Blocks: 9
  References: `Form.tsx:39-46` (Props), `:89-110` (destructure + useForm), `:134-139` (fetchDebt effect), `:190-198` (submit), `:215-244` (judul + banner draft), `:269-335` (Data Utama)
  Acceptance: GET edit → form terisi dari transaction (farmer, tanggal, harga, muatan); textarea alasan wajib; submit → PUT update dengan revision_reason.
  QA: `npm run types:check` exit 0; e2e setelah todo 10. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-7-form-revision.md` (diff).
  Commit: N (squash final)

- [ ] 8. Frontend `List.tsx` — tombol Aksi "Edit" dan "Hapus" per baris
  What to do / Must NOT do: Di kolom Aksi tbody (saat ini hanya Link "Nota"), tambah dua elemen SEBELUM Link Nota:
  ```tsx
  <Link
      href={weighingRoute.edit(tx.id)}
      data-test="tx-edit"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
  >
      Edit
  </Link>
  <button
      onClick={() => {
          if (confirm(`Batalkan nota ${tx.nota_number} untuk ${tx.farmer_name_snapshot}? Saldo kasir dan petani akan dikoreksi otomatis.`)) {
              router.post(weighingRoute.cancel(tx.id).url);
          }
      }}
      data-test="tx-void"
      className="inline-flex h-8 items-center rounded-lg border border-sidebar-border/50 px-3 text-xs font-medium text-muted-foreground transition hover:border-red-400/60 hover:text-red-500"
  >
      Hapus
  </button>
  ```
  Tambah import `Pencil` dari lucide-react bila ingin icon (opsional — minimal tanpa icon baru: teks saja). Wrap dalam `<div className="flex items-center justify-center gap-2">`. MUST NOT: ubah pola tombol draft (draft-card) — hanya baris tabel riwayat.
  Parallelization: Wave 1 | Blocked by: 5, 6 | Blocks: 9
  References: `List.tsx:348-361` (kolom Aksi), `:138-162` (pola confirm + router.post cancel draft)
  Acceptance: Tombol Edit & Hapus muncul per baris; Hapus → confirm → POST cancel; Edit → halaman form revisi.
  QA: e2e/todo 10 + manual di browser. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-8-list-actions.md` (diff).
  Commit: N (squash final)

- [ ] 9. Feature test BARU `tests/Feature/WeighingRevisionVoidTest.php`
  What to do / Must NOT do: Buat file Pest baru (jangan sertakan direktori di nama file; pola `php artisan make:test --pest`). Test WAJIB (ikuti pola assertion `WeighingTransactionTest.php` / `CashFlowTest.php`, RefreshDatabase via Pest.php):
  1. `edit page renders latest printed transaction` — GET edit → Inertia prop `transaction.nota_number`.
  2. `revisi transaksi final membuat nota baru + mengarsipkan lama` — setup 1 printed tx (via store flow atau factory+helper), PUT update + revision_reason → assert: row baru `status=printed`, `is_latest_version=true`, `revision_of=old.id`, `revision_number=old+1`, `revision_reason` tersimpan, `nota_number` berbeda; row lama `status=revised`, `is_latest_version=false`, `cashier_balance_deducted=false`; assert 2 cash entries (1 negatif reversal tx lama + 1 positif tx baru) dan debt payment reversal + baru; `farmer.balance` = net hanya debt_paid baru.
  3. `revisi tanpa revision_reason → 422`.
  4. `revisi transaksi non-latest → 422`.
  5. `void transaksi final` — POST cancel → cancelled + is_latest false; cash entry reversal negatif; debt reversal negatif; farmer balance terkoreksi; index() tidak memuat row.
  6. `void transaksi draft tetap perilaku lama (tanpa reversal)` — POST cancel draft → tidak ada entry baru (hanya status berubah).
  7. `void transaksi non-latest → 422`.
  MUST NOT: ubah test existing; jangan buat factory baru (pola: buat data via HTTP store atau model create + finalizeDraft private — pilih pola yang dipakai `WeighingTransactionTest.php` untuk membuat transaksi printed).
  Parallelization: Wave 1 | Blocked by: 4, 5, 6 | Blocks: F4, F5
  References: `tests/Feature/WeighingTransactionTest.php` (pola setup + assertion), `tests/Feature/CashFlowTest.php` (assertion cash entries), `tests/Feature/Security/*` (pola guard)
  Acceptance: Semua test hijau; RED dulu → GREEN setelah todo 4-6 (tulis sebelum implementasikan branch, jalankan → RED).
  QA: `php artisan test --compact --filter=WeighingRevisionVoidTest` → PASS. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-9-tests.md` (output RED & GREEN).
  Commit: N (squash final)

- [ ] 10. Update test JS + E2E
  What to do / Must NOT do: (a) `tests/JS/weighing-form.test.ts` — tambah assertion `revision_reason: ''` di initial state (pola assert shape yang sudah ada; pastikan tidak patah). (b) `tests/e2e/weighing.spec.ts` — tambah 2 test: (i) edit: buka riwayat → klik `[data-test="tx-edit"]` baris pertama → ubah satu nilai muatan → isi alasan revisi → submit → assert success page title/nota baru; (ii) void: buka riwayat → `page.once('dialog', d => d.accept())` → klik `[data-test="tx-void"]` → assert toast sukses (sonner `[data-sonner-toast]` hasText) + row hilang dari daftar (reload). MUST NOT: ikuti konvensi e2e existing (selectors `data-test`, filter `[data-sonner-toast]`, `page.once('dialog', …)` untuk confirm — lihat memory: dialog confirm butuh `page.once('dialog', d=>d.accept())`).
  Parallelization: Wave 1 | Blocked by: 7, 8 | Blocks: F3, F6
  References: `tests/JS/weighing-form.test.ts`, `tests/e2e/weighing.spec.ts` (pola existing), memory context e2e setup (playwright.config :8010, empty :8011)
  Acceptance: Assertion shape baru tidak patah; e2e edit & void PASS di kedua config.
  QA: `npm run test:js`; `composer run test:e2e` → PASS. Evidence `.omo/evidence/weighing-history-search-nama-petani/task-10-js-e2e.md`.
  Commit: N (squash final)

## Final verification wave

- [ ] F1. Gate PHP pint: `vendor/bin/pint --dirty --format agent` → "passed"
  References: todos 1,4,5,6 | Acceptance: exit 0
  QA: jalankan di root. Evidence `.omo/evidence/weighing-history-search-nama-petani/f1-pint.txt`
  Commit: N (squash)

- [ ] F2. Route + regenerasi wayfinder: `php artisan route:list --path=weighing` memuat `weighing/edit`; `grep "weighing edit"` di resources/js/routes
  References: todo 3 | Acceptance: route edit ada; TS route ada (setelah build/dev)
  QA: verifikasi setelah `npm run build`/dev. Evidence `.omo/evidence/weighing-history-search-nama-petani/f2-routes.txt`
  Commit: N (squash)

- [ ] F3. Gate frontend: `npm run types:check` + `npm run lint` → exit 0
  References: todos 2,7,8,10 | Acceptance: tsc bersih; eslint bersih (routes/ dan ui/ di-ignore sesuai AGENTS.md)
  QA: jalankan di root. Evidence `.omo/evidence/weighing-history-search-nama-petani/f3-frontend.txt`
  Commit: N (squash)

- [ ] F4. Regression feature test: `php artisan test --compact` (seluruh suite) → hijau
  References: todos 5,6,9 | Acceptance: 122+ test existing + WeighingRevisionVoidTest semua PASS (bukti refactor finalizeDraft/extract helper tidak merusak apa pun)
  QA: `composer test` full. Evidence `.omo/evidence/weighing-history-search-nama-petani/f4-full-suite.txt`
  Commit: N (squash)

- [ ] F5. Test JS: `npm run test:js` → hijau
  References: todo 10 | Acceptance: Vitest PASS
  QA: jalankan di root. Evidence `.omo/evidence/weighing-history-search-nama-petani/f5-js-test.txt`
  Commit: N (squash)

- [ ] F6. E2E: `composer run test:e2e` → hijau (31+2 test)
  References: todo 10 | Acceptance: semua spec PASS (2 server config, chrome/chromium per env)
  QA: ikuti konvensi e2e proyek (seed 2 SQLite DB, `php artisan --env=e2e serve` :8010/:8011). Evidence `.omo/evidence/weighing-history-search-nama-petani/f6-e2e.txt`
  Commit: N (squash)

## Commit strategy

- SATU squash commit setelah F1-F6: `feat(weighing): pencarian nama petani, revisi nota, dan pembatalan transaksi di riwayat timbangan` — mencakup todos 1-10 + verifikasi F1-F6.