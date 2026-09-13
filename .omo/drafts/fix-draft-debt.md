# Draft Plan: fix-draft-debt

> DRAFT — belum disetujui. Status: awaiting-approval.
> Generated via ulw-plan (Prometheus). Slug: `fix-draft-debt`

## Request state (ulw-plan review contract)

```json
{
  "transition": "replace",
  "phase": "execution_complete",
  "applies_when": ["explicit_review_modifier_before_complete_plan"],
  "atomic": true,
  "review_required": true,
  "plan_path": ".omo/plans/fix-draft-debt.md",
  "plan_sha256": null,
  "review_round_id": "r1",
  "review_verdicts": {
    "metis": "APPROVE (6 findings minor/nit — semua sudah di-fold ke plan)",
    "momus": "APPROVE (2 minor non-blocking)",
    "oracle": "APPROVE (3 minor non-blocking; verifikasi nyata: DraftDebtPreserveTest 4 passed/12 assertions, npm run test:js 3 files/80 tests passed)"
  },
  "final_wave_verdicts": {
    "F1": "APPROVE (plan compliance — 4 file sesuai plan, zero dependency baru)",
    "F2": "APPROVE (code quality — 8/8 items, Number() bukan parseFloat, lint clean)",
    "F3": "APPROVE (real execution — vitest 6 passed, DraftDebtPreserveTest 5 passed, composer test 123/123/649, exit 0 semua)",
    "F4": "APPROVE (scope fidelity — hanya 4 file product/test, backend #6b utuh)"
  },
  "user_approval": "approved (2026-09-13)",
  "pending_action_policy": { "review_required": "write and review .omo/plans/fix-draft-debt.md", "otherwise": "write .omo/plans/fix-draft-debt.md" },
  "pending-action": "commit squash fix(perhitungan): draft pertahankan hutang saat dibuka kembali (init form dari draft)"
}
```

## Intent

- `intent: clear`
- `review_required: true` (user meminta high-accuracy review: "high-accuray review dulu")
- User: "coba test #6b, saat saya coba simpan draft dan buka kembali hutangnya tetap hilang"
- Outcome: membuka kembali draft yang disimpan dengan `debt_paid_amount > 0` harus MENAMPILKAN dan MEMPERTAHANKAN nilai hutangnya (tidak tampil 0 / tidak tertimpa 0 saat simpan ulang).

## Root cause (teknis, sudah diverifikasi)

Bug #6b fix sebelumnya HANYA memperbaiki sisi backend (store/update/fillTransactionData sudah menyimpan `debt_paid_amount` apa adanya — test `DraftDebtPreserveTest` PASS karena mengirim POST langsung dengan nilai).

**Bug sebenarnya ada di FRONTEND**: `resources/js/pages/Weighing/Form.tsx` baris 130:

```ts
debt_paid_amount: 0,   // ← HARDCODED, tidak diinisialisasi dari draft!
```

Alur nyata user:
1. Isi "Bayar Hutang Hari Ini" = 100.000 → SIMPAN DRAFT → `store()` → DB simpan `debt_paid_amount = '100000.00'` ✓
2. Redirect ke `weighing.create?draft={id}` → `create()` load draft → Inertia kirim prop `draft` (berisi debt_paid_amount) ✓
3. **Form.tsx inisialisasi `debt_paid_amount: 0`** (semua field lain pakai `draft ? ... : ...`, field hutang TIDAK) → field "Bayar Hutang" tampil 0 → "hutang hilang"
4. Jika user klik SIMPAN DRAFT / SELESAI & CETAK lagi tanpa mengubah → `update()`/`finalize()` menerima `debt_paid_amount = 0` → **nilai DB ditimpa 0. Data loss permanen.**

`WeighingTransaction` TS type sudah punya `debt_paid_amount: number` (types/domain.ts:70) — fix aman untuk types:check.

## Pendekatan fix (best practice: testable, tanpa dependency baru)

1. **Ekstrak** object initialisasi `useForm` dari Form.tsx ke pure function baru `buildInitialWeighingFormState()` di `resources/js/lib/weighing-form.ts` (pola sama seperti `lib/utils.ts` yang sudah di-unit-test via Vitest).
2. **Fix inti di fungsi tsb**: `debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0` — semua field lain dipindah verbatim dari object literal Form.tsx saat ini.
3. **Form.tsx** pakai fungsi tsb (`useForm(buildInitialWeighingFormState(...))`) — perubahan import + baris inisialisasi saja.
4. **Test JS baru** `tests/JS/weighing-form.test.ts` (Vitest, tanpa dependency baru — pola `utils.test.ts`): test RED dulu (draft dengan debt 100000 → state.debt_paid_amount harus 100000, bukan 0) lalu fix → GREEN.
5. **Test backend tambahan** di `DraftDebtPreserveTest.php`: GET `weighing.create?draft=` → `assertInertia` bahwa prop `draft.debt_paid_amount` dikirim utuh '100000.00' (jaring pengaman sisi server).
6. Verifikasi: `npm run test:js`, `npm run lint`, `npm run types:check`, `composer test` full suite.

## Keputusan yang diambil (default, tidak perlu ditanya)

- Tidak menambah dependency baru (@testing-library/react/jsdom) — dihindari sesuai guardrail AGENTS.md.
- Pure function + Vitest dipilih agar bug frontend benar-benar ditangkap test (bukan hanya manual).
- Tidak ada perubahan backend logic (backend sudah benar) — hanya tambah 1 assertion test.
- Guard #4 (debt > gross) & TOCTOU #6 & #6b lainnya tidak disentuh.

## Tasks (draft — akan diisi setelah approval)

- [ ] 1. Buat `resources/js/lib/weighing-form.ts` dengan `buildInitialWeighingFormState()` (fix debt_paid_amount dari draft) — pindahkan object literal verbatim dari Form.tsx
- [ ] 2. Update `Form.tsx` untuk memakai fungsi tsb (import + ganti `useForm({...})` → `useForm(buildInitialWeighingFormState(...))`)
- [ ] 3. Buat `tests/JS/weighing-form.test.ts` — red-to-green: draft debt 100000 → state 100000; tanpa draft → 0; draft debt 0 → 0
- [ ] 4. Tambah test `assertInertia` di `DraftDebtPreserveTest.php` (GET create?draft mengirim debt utuh)
- [ ] 5. Verifikasi: `npm run test:js` + `npm run lint` + `npm run types:check` + `composer test` → semua hijau, evidence di `.omo/evidence/`

## Approval gate

- status: **execution_complete** (r1: metis APPROVE, momus APPROVE, oracle APPROVE; user approval 2026-09-13; final wave F1-F4 semua APPROVE 2026-09-13)
- Next: commit squash `fix(perhitungan): draft pertahankan hutang saat dibuka kembali (init form dari draft)` (4 file).