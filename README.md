# Game Arcade Hub — GUN HIT (SGA)

Satu game arkade Android (Capacitor + Vite + React + TypeScript):

| Game | Isi |
|---|---|
| **GUN HIT** (SGA) | 100 stage, 11 bos, 90 senjata, stage spesial, misi & achievement |

Gameplay punya dua **mode tampilan** yang bisa dipilih pemain: **📱 POTRET**
(bawaan, senjata di bawah menembak ke atas) dan **🎮 LANDSCAPE** (senjata di tepi
kiri menembak ke kanan, roda/musuh di tepi kanan). Dunia, hitbox, dan 100 stage-nya
sama persis — detailnya di `GAMES.md` bagian *Mode tampilan*.

Game B (PERFECT SHOT) sudah **dihapus**; aset visual & audio bersamanya
(`HeadArt`, `TargetArt`, `levels`, `FlatIcons`, `sfx`, `themes`, `GiftArt`,
`index.css`) tetap dipakai Game A dan karena itu dipertahankan.

Aplikasi berjalan **offline**: tanpa iklan, tanpa akun, tanpa SDK analitik, tanpa
pengiriman data. Paket rilis: `com.gamearcade.hub`, nama tampil "Game Arcade Hub".

## Mulai

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 678 tes (node:test + tsx)
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
| `GAMES.md` | penamaan game, catatan penghapusan Game B, alur layar |
| `BUILD-APK.md` | build APK/AAB, keystore, ikon & splash, langkah Play Console |
| `docs/SAVE-DATA.md` | format simpanan, versi skema, migrasi, checksum, keputusan leaderboard lokal |
| `docs/ANALYTICS.md` | funnel & event telemetri (default: tidak mengirim apa pun) |
| `docs/TEST-PLAN.md` | checklist QA perangkat |
| `docs/PRIVACY.md` · `docs/DATA-SAFETY.md` · `docs/CONTENT-RATING.md` | kepatuhan toko |

## Struktur

```
src/games/gunhit/       Game A: App, komponen, engine (game/Game.ts), art, mode tampilan
src/games/perfect-shot/ aset bersama (art, ikon, sfx, tema, index.css) — bukan game lagi
src/games/knife-hit/    efek & komponen bersama
src/i18n/               katalog teks id/en (strings, weaponEn, dataEn)
src/storage/            simpanan berversi + checksum + leaderboard lokal
src/telemetry/          analytics no-op, session, error hooks
tools/                  build Android, render aset, audit performa
tests/                  node:test (678 tes)
store/                  aset & teks Play Console
references/             zip referensi visual (arsip, tidak ikut bundel)
```

## CI

`.github/workflows/ci.yml` — setiap push/PR: `npm ci` → `tsc --noEmit` → `npm test`
→ `npm run build` (artefak `dist`) + pemeriksaan aset toko. Build Android dan
unggah ke Play Console tetap manual (butuh SDK + keystore).
