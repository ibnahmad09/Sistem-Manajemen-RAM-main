# SISawit — Palm Oil Management System

## Stack & Versi

- PHP 8.4, Laravel 13, Inertia v3, React 19, Tailwind v4
- Fortify (auth), Wayfinder (TS routes), Pest v4 (tests)
- Database: MySQL (local), SQLite `:memory:` (test)

## Perintah Utama

| Kegiatan | Perintah |
|---|---|
| Dev server (3 service) | `composer run dev` |
| Fix PHP formatting | `vendor/bin/pint --format agent` |
| Fix JS/TS | `npm run format && npm run lint && npm run types:check` |
| Test penuh | `composer test` |
| Test spesifik | `php artisan test --compact --filter=NamaTest` |
| Cek routes | `php artisan route:list --method=GET --name=...` |
| CI pipeline penuh | `composer ci:check` |

## MCP & Boost

- Laravel Boost MCP aktif via `.cursor/mcp.json` — tools: `database-query` (read-only), `database-schema`, `search-docs`, `get-absolute-url`
- `boost.json` agents: `["cursor", "opencode"]`

## Route & Wayfinder

- Named routes via `route()` di PHP, impor `@/routes/nama-route` di TypeScript
- Wayfinder routes (`resources/js/routes/`) auto-generated oleh Vite plugin — **jangan diedit manual**, di-gitignore
- **⚠ Route ordering**: `weighing/success` HARUS sebelum `weighing/{weighing}` (resource route)
- Role middleware variadic: `role:super_admin,cashier`

## Inertia v3

- Layout resolver di `app.tsx`: `welcome`=null, `auth/*`=AuthLayout, `settings/*`=[AppLayout+SettingsLayout]
- `Inertia::lazy()` sudah dihapus — pakai `Inertia::optional()`
- `router.cancel()` → `router.cancelAll()`
- Jangan Axios — pakai built-in Inertia XHR

## Arsitektur

- **3 role**: super_admin (full), cashier (operasional), owner (laporan)
- Shared data via `HandleInertiaRequests`: `name`, `auth.user`, `flash` (success/error), `sidebarOpen`
- Business logic: `WeighingTransaction::calculate()` — `has_deduction` defaults ke `true`
- Revision system: `revision_of` (self FK) + `is_latest_version` flag
- Nota number format: `HND-YYYYMMDD-XXXX`
- UI Bahasa Indonesia: petani, bayar, timbang, utang, nota

## Testing

- Hanya Feature tests pakai `RefreshDatabase` (dari `Pest.php`) — Unit tests tidak
- Factory hanya untuk User — model lain belum punya factory
- `php artisan make:test --pest NamaTest` — jangan sertakan direktori di nama
- Jangan hapus test tanpa approval

## Formatting & Linting

- Pint: preset laravel (`pint.json`)
- Prettier: tabWidth=4, singleQuote=true, tailwindcss plugin
- ESLint: brace-style 1tbs, padding antar control statements, consistent type imports
- Di-ignore dari lint: `resources/js/routes/**`, `resources/js/components/ui/*`, `resources/js/actions/**`

## Gotcha

- `.npmrc` → `ignore-scripts=true` — npm install tidak jalanin hooks
- `.env.example` pakai SQLite, `.env` asli pakai MySQL
- Session + Cache + Queue semua pakai database driver
- Tailwind v4 pakai `@import 'tailwindcss'` bukan `@tailwind` directives — dark mode via class `.dark`
- `WeighingTransaction` self-referential FK `revision_of` — hati-hati hapus/revisi

## Skills

Skills domain ada di `.cursor/skills/`. Aktifkan skill yang relevan saat bekerja di area tersebut:
- `inertia-react-development` — halaman React + Inertia
- `fortify-development` — auth/fortify
- `wayfinder-development` — route generation
- `pest-testing` — test patterns
- `tailwindcss-development` — Tailwind v4
- `laravel-best-practices` — 20+ aturan Laravel (security, Eloquent, DB, dsb)
