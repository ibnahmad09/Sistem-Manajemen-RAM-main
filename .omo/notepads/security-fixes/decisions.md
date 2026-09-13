# security-fixes — Decisions

## [2026-09-13] Execution decisions
- Commit: squash 1 commit `fix(security): 9 security fixes dari audit keamanan` (plan menawarkan pilihan; squash lebih rapi untuk user)
- Test DB: SQLite :memory: — lockForUpdate no-op (C9), race di-approximate sequential
- Guard #4: throw \InvalidArgumentException di dalam try → catch existing menangani rollback + withErrors(['error'])
- RoleMiddleware: JANGAN session()->invalidate()/regenerate() setelah auth()->logout() — flash errors harus survive
- #8: rute reports dibungkus role middleware (semua 3 role) — status check aktif di sana, akses role tidak berubah
