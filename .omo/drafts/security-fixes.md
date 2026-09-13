---
slug: security-fixes
status: drafting
intent: clear
review_required: true
plan_path: .omo/plans/security-fixes.md
plan_sha256: e4fea869312f3e7e03ec3934b4ec693728624b05561e562017468d38566a288f
review_round_id: rnd-secfix-20260913-02
review_round_02:
  momus:
    status: approved
    launch_id: launch-secfix-momus-20260913-02
    session: ses_f692d9788ffeTioCZJ5AIlYix8
    verdict: APPROVE
    sha_match: true
    result: >
      Final answer: APPROVE. VERIFY(final) shasum e4fea869312f3e7e03ec3934b4ec693728624b05561e562017468d38566a288f
      exact match. M1-M3 terverifikasi FIXED (todo3 QA /weighing + /reports dengan CATATAN /dashboard bukan target;
      todo5 contoh 'Pak Budi = petani'; todo9 QA(3) sequential double-finalize eksplisit). 3 non-blocking notes:
      (1) todo2 menawarkan opsi FormRequest tapi implementasi minimal konkret sudah diberikan;
      (2) todo9 placeholder $validated merujuk blok lama :232-242 untuk di-copy;
      (3) todo5 konstruksi test row mengikuti pola ReportsExportTest.php yang sudah ada.
  independent:
    status: approved
    launch_id: launch-secfix-oracle-20260913-02
    session: ses_f692d3938ffe2W8s6iRze5DVkW
    verdict: APPROVE
    sha_match: true
    result: "Verdict: APPROVE. Required changes: None. C1-C10 semua direpair benar di plan & kode; SHA match; plan executable."
pending-action: plan APPROVED round 2 (momus + oracle) — siap eksekusi via /start-work
review_history:
  rnd-secfix-20260913-01:
    momus:
      verdict: CHANGES_REQUESTED
      launch_id: launch-secfix-momus-20260913-01
      session: null
      sha_match: true
      issues: "[M1] todo3 QA(2) /dashboard tanpa role middleware (web.php:18-27) -> assertRedirect(login) FAIL; [M2] todo5 QA(2) contoh nama '= \"Pak Budi\"' kontradiktif (prefix = adalah formula); [M3] todo9 QA(3) race tak testable langsung di Pest (perlu approximation eksplisit)"
    independent:
      verdict: CHANGES_REQUESTED
      launch_id: launch-secfix-oracle-20260913-01
      session: null
      sha_match: true
      issues: "C1 #8 coverage rute reports (web.php:110-112) tanpa role middleware; C2 QA dashboard (sama M1); C3 destroy() tanpa $request -> guard tidak compile; C4 show() IDOR read unguarded; C5 errors.error tidak dirender di UI; C6 sanitizeFormula(string) TypeError pada null; C7 Excel::fake() tak bisa assert isi cell; C8 $loads stale dibangun sebelum transaksi di finalize; C9 lockForUpdate no-op di SQLite perlu di-declare; C10 guard #4 menyentuh save_draft perlu intent eksplisit"
  rnd-secfix-20260913-02:
    momus:
      verdict: APPROVE
      launch_id: launch-secfix-momus-20260913-02
      session: ses_f692d9788ffeTioCZJ5AIlYix8
      sha_match: true
      issues: "3 non-blocking notes: todo2 opsi FormRequest (implementasi minimal sudah diberikan); todo9 placeholder $validated merujuk blok lama :232-242; todo5 test row mengikuti pola ReportsExportTest.php"
    independent:
      verdict: APPROVE
      launch_id: launch-secfix-oracle-20260913-02
      session: ses_f692d3938ffe2W8s6iRze5DVkW
      sha_match: true
      issues: "Required changes: None. C1-C10 semua direpair benar; plan executable."
repairs_applied:
  - "todo3 (#8): RoleMiddleware refactor $user + cek status + auth()->logout() + withErrors(['email']) tanpa session regenerate; web.php:110-112 dibungkus Route::middleware(['role:super_admin,cashier,owner']); QA dashboard -> /weighing + /reports; acceptance + QA scenario reports"
  - "todo4 (#2): show()/destroy() tambah Request $request (method injection); guard ditambah ke show() juga; QA tambah scenario GET /cash-flow/{entryB} -> 403; acceptance show"
  - "todo5 (#5): sanitizeFormula(?string $value): ?string null-safe; assert isi cell via Excel::store + Storage::fake + IOFactory::load (bukan Excel::fake); contoh reword ke 'Pak Budi = petani'; line ref mapDebtRow :71-72"
  - "todo8 (#4): intent eksplisit guard berlaku semua action incl save_draft (C10); render errors.error di Weighing/Form.tsx antara :889-:891 (C5); acceptance + QA scenario (4) save_draft crafted"
  - "todo9 (#6): $farmer/$loads/$validated dipindah ke dalam try dari model fresh hasil re-fetch with('loads') (C8); acceptance nyatakan limitasi SQLite lock no-op (C9); QA(3) eksplisit sequential double-finalize approximation (M3); typo 'transpiring' diperbaiki"
  - "kosmetik: wave label todo 10/11 -> Wave 3; rollBack FarmerDebtController :151; F4 UI check + Form.tsx; commit 7 + Form.tsx; success criteria 5; TL;DR machine; scope #2/#8 diperbarui"
approach: Fix temuan security audit yang sudah divalidasi 2 PoC engineer; scope = ALL 9 surviving findings; kebijakan blokir untuk #4; trustProxies dinonaktifkan (dev lokal)
---

# Draft: security-fixes

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
<!-- auth status (#8) | aktif | .omo/evidence/security/cross-check.txt -->
<!-- debt flow (#4, #6b, #9, #6) | aktif | .omo/evidence/security/poc-a.txt, poc-b.txt -->
<!-- cashflow IDOR (#2) | aktif | .omo/evidence/security/surface-hunter.txt -->
<!-- export (#5, #11) | aktif | .omo/evidence/security/auth-data-hunter.txt -->
<!-- proxy (#7) | aktif | .omo/evidence/security/surface-hunter.txt -->

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
<!-- #4: blokir (bukan potong) | keputusan user | aman & sederhana | ya -->
<!-- #7: tanpa proxy | keputusan user (dev lokal) | tidak ada proxy nyata | ya, saat deploy -->

## Findings (cited - path:lines)
Semua terdokumentasi di .omo/evidence/security/ (surface-hunter.txt, auth-data-hunter.txt, runtime-supply-hunter.txt, poc-a.txt, poc-b.txt, cross-check.txt).

Surviving (11) — diverifikasi ulang di kode oleh planner:
1. HIGH — Open registration -> cashier; MustVerifyEmail di-comment (app/Models/User.php:5), Features::registration() aktif (config/fortify.php:147), CreateNewUser.php:27-31 tanpa role -> default cashier (migration 2026_05_07_150154). **USER: SKIP (biarkan saja)**
2. LOW-MED — CashFlow IDOR: index scoped cashier_id (CashFlowController.php:22-24) tapi update/show/destroy tanpa ownership guard (:115-161). **IN SCOPE**
3. INFO — Weighing draft IDOR (WeighingTransactionController.php:164/216/272) — shared workspace by design. Tidak di-fix.
4. MED — debt_paid_amount unbounded: validatedData :337 tanpa batas max, calculate :413 + fillTransactionData :454 zeroing saat save_draft, finalizeDraft :523-534 -> CashierCashEntry amount negatif (final = gross - debtPaid, WeighingTransaction.php:265). **IN SCOPE — BLOKIR (keputusan user)**
5. MED — Excel formula injection: ReportsExport.php:42-59 menulis farmer_name_snapshot/kasir_name tanpa sanitasi; PHPSpreadsheet DefaultValueBinder memperlakukan prefix = + - @ sebagai formula. **IN SCOPE**
6. LOW — Double-finalize TOCTOU: status check sebelum DB::beginTransaction (WeighingTransactionController.php:216 vs :244); unique nota_number membatasi. **IN SCOPE**
6b. MED — save_draft membuang debt_paid_amount: calculate :413 & fillTransactionData :454 hardcode 0 saat save_draft -> hutang petani tak pernah berkurang saat draft difinalisasi via finalize() (:240 pakai $weighing->debt_paid_amount yang sudah 0). **IN SCOPE**
7. MED — trustProxies('*') (bootstrap/app.php:18) + login throttle keyed $request->ip() (FortifyServiceProvider.php:86) -> rotasi X-Forwarded-For bypass 5/min. **IN SCOPE — nonaktifkan trustProxies (dev lokal, keputusan user)**
8. MED — users.status tidak di-enforce: RoleMiddleware.php:22 hanya cek role. **IN SCOPE**
9. MED — FarmerDebt show/destroy broken: route param {debt} (web.php:73-74) vs controller $farmerDebt (FarmerDebtController.php:124/134) -> implicit binding skipped -> fresh empty model -> fatal Error (bukan Exception) -> 500 + dangling DB transaction meracuni request berikutnya (PoC-A+B). **IN SCOPE**
10. MED-HIGH — Farmer destroy cascade (FarmerController.php:92-98, FK onDelete cascade). **USER: SKIP (biarkan saja)**
11. LOW — Export date param tanpa validasi (ReportsController.php:25-31/53-59/102) -> 500 DoS ringan; filename injection diblokir Symfony. **IN SCOPE**

## Decisions (with rationale)
- #1 (registrasi): SKIP — user memutuskan "biarkan saja". Catatan residual risk: sistem tetap terbuka untuk siapa pun -> cashier. Dicatat sebagai keputusan owner.
- #10 (hapus petani cascade): SKIP — user memutuskan "Biarkan (tanpa fix)". Residual risk: riwayat finansial bisa hilang oleh cashier.
- #3 (draft IDOR): tidak di-fix (INFO, by design) — workspace bersama.
- #4 (hutang > timbangan): BLOKIR dengan pesan error — user memilih "Blokir dengan pesan error (Recommended)". Validasi hutang bayar <= total timbangan di FormRequest/controller; cashier harus input ulang.
- #7 (trustProxies): HANYA dev lokal — user: "Hanya dev lokal (localhost)". Fix: hapus trustProxies('*') (set array kosong / nonaktifkan); tidak ada proxy di deployment saat ini. Saat deploy nanti, perlu diisi ulang sesuai proxy nyata.
- Scope: ALL 9 — user memilih semua temuan tersisa (#6b, #4, #9, #7, #8, #6, #2, #5, #11).

## Scope IN
- #6b save_draft pertahankan debt_paid_amount
- #4 blokir hutang bayar > total timbangan (pesan error)
- #9 fix binding route farmer-debts + rollback transaksi
- #7 hapus trustProxies('*')
- #8 enforce users.status inactive (middleware + login)
- #6 pindah cek status ke dalam transaksi (lockForUpdate)
- #2 scoping ownership cashflow update/destroy
- #5 sanitasi formula injection di export Excel
- #11 validasi param tanggal export

## Scope OUT (Must NOT have)
- #1 registrasi (keputusan user: biarkan)
- #10 hapus petani (keputusan user: biarkan)
- #3 draft IDOR (INFO, by design)
- Perubahan besar lainnya: tidak ada refactor arsitektur, tidak ada dependency baru, tidak ada perubahan schema DB (kecuali diperlukan minimal dan disetujui)

## Open questions
TIDAK ADA — semua fork sudah dijawab (scope, kebijakan #4, environment #7).

## Approval gate
status: plan-approved
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
<!-- Nov 17 2026 — brief dipresentasikan, menunggu explicit okay user sebelum menulis .omo/plans/security-fixes.md -->
<!-- Sep 13 2026 — plan ditulis, melewati high-accuracy review round 1 (CHANGES_REQUESTED, M1-M3/C1-C10, semua direpair) dan round 2 (APPROVE dari momus + oracle, sha_match true, zero blocking). Siap eksekusi via /start-work. -->