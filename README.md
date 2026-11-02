# Game Arcade Hub

Dua game arkade dalam satu aplikasi Android (Capacitor + Vite + React + TypeScript):

| Pane | Game | Isi |
|---|---|---|
| A | **GUN HIT** (SGA) | 100 stage, 11 bos Game B, 90 senjata, stage spesial, misi & achievement |
| B | **PERFECT SHOT** | roda berputar, 30 pisau (3 skin), codex, achievement |

Aplikasi berjalan **offline**: tanpa iklan, tanpa akun, tanpa SDK analitik, tanpa
pengiriman data. Paket rilis: `com.gamearcade.hub`, nama tampil "Game Arcade Hub".

## Mulai

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 660 tes (node:test + tsx)
npx tsc --noEmit     # typecheck
npm run build        # bundel web ke dist/
```

## Build Android

```bash
npm run build:apk    # release/GameArcadeHub-v<versi>-release.apk
npm run build:aab    # untuk Play Console
npm run version:bump # naikkan versiName/versiCode
```

Detail keystore, signing, ikon & splash: **`BUILD-APK.md`**.

## Rilis ke toko

| Langkah | Berkas |
|---|---|
| Aset toko (ikon, feature graphic, screenshot) | `store/` — buat ulang: `npm run store:assets`, periksa: `npm run check:store` |
| Teks listing Indonesia / Inggris | `store/listing-id.md`, `store/listing-en.md` |
| Uji di HP fisik | `docs/TEST-PLAN.md` |
| Data safety & rating | `docs/DATA-SAFETY.md`, `docs/CONTENT-RATING.md` |
| Kebijakan privasi (butuh URL publik) | `docs/PRIVACY.md` (dibuat dari `npm run docs:privacy`) |

## Dokumen

| Berkas | Isi |
|---|---|
| `GAMES.md` | peta dua game, sumber referensi, alur layar |
| `BUILD-APK.md` | build APK/AAB, keystore, ikon & splash, langkah Play Console |
| `docs/SAVE-DATA.md` | format simpanan, versi skema, migrasi, checksum, keputusan leaderboard lokal |
| `docs/ANALYTICS.md` | funnel & event telemetri (default: tidak mengirim apa pun) |
| `docs/TEST-PLAN.md` | checklist QA perangkat |
| `docs/PRIVACY.md` · `docs/DATA-SAFETY.md` · `docs/CONTENT-RATING.md` | kepatuhan toko |

## Struktur

```
src/games/gunhit/       Game A: App, komponen, engine (game/Game.ts), art
src/games/perfect-shot/ Game B: App, komponen, data quest/ach/codex/shop
src/games/knife-hit/    efek & komponen bersama
src/i18n/               katalog teks id/en (strings, weaponEn, dataEn)
src/storage/            simpanan berversi + checksum + leaderboard lokal
src/telemetry/          analytics no-op, session, error hooks
tools/                  build Android, render aset, audit performa
tests/                  node:test (660 tes)
store/                  aset & teks Play Console
```

## CI

`.github/workflows/ci.yml` — setiap push/PR: `npm ci` → `tsc --noEmit` → `npm test`
→ `npm run build` (artefak `dist`) + pemeriksaan aset toko. Build Android dan
unggah ke Play Console tetap manual (butuh SDK + keystore).
