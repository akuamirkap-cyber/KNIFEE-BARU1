# PERFECT SHOT v2 — Lite

**Duplikasi ringan Perfect Shot asli, bukan game/desain baru.** Menu PERFECT
SHOT hijau–kuning, latar hutan, gambar Pistol, tombol QUEST/PLAY, navigasi
GUN/RANKS/READY!/SETTING, Armory ungu, dan peta pilar air memakai sumber tampilan
v1 yang sama, dipisahkan dan dipangkas untuk paket ini.

## Batas isi paket

- **GUN: satu PISTOL**, memakai gambar asli dan animasi slide/recoil-nya.
- **QUEST: hanya level 1** (pilar **GENTONG**, target jeruk seperti v1).
- Level 1: **5 peluru**, target radius 95, putaran konstan 1.61 rad/detik dengan
  arah acak, 0–2 koin, tanpa rintangan awal. Menabrak peluru yang sudah menancap
  langsung game over, mengikuti aturan classic v1—bukan sistem tiga nyawa baru.
- Pistol memakai parameter v1 dan preset efek 9mm default-nya. Combo mengikuti
  jendela 0.5 detik v1: mulai hit ketiga, poin hit dikali dua.
- Selesai level 1 berarti **ulang level 1**, **QUEST**, atau **MENU**. Tidak ada
  auto-advance, level 2, boss, toko senjata lain, atau kampanye tersembunyi.
- Rekor lokal, pause, pengaturan suara, dan satu achievement level 1 tetap ada.

**Konten lain benar-benar tidak disertakan.** ZIP tidak membawa katalog lengkap,
renderer senjata lain, artwork boss/target lain, ported slides, Android project,
referensi ZIP, `node_modules`, atau kode game v1 lalu menyembunyikannya lewat
filter/lock. `levels.ts` dan `weapons.ts` masing-masing hanya memiliki satu baris.

**V1 tetap utuh/default di Gun Hit Arcade.** Paket ini hanya dipakai ketika V2
dipilih. Save memakai `perfect-shot.v2.lite.save`; tidak membaca/menulis/reset
save v1, dan tidak mengimpor save prototipe v2 sebelumnya.

## Langsung dimainkan setelah ekstrak

1. Ekstrak `perfect-shot-v2.zip`.
2. Buka **`v2-perfect-shot/dist/index.html`** di browser.
3. Tekan **PLAY**, atau **QUEST → PLAY**.

Hasil build adalah **satu HTML mandiri**. JavaScript, CSS, React, gambar, font,
dan SFX sudah di dalamnya. Tidak perlu npm, server, CDN, font daring, atau
koneksi internet untuk menjalankan hasil build. Beberapa browser membatasi
penyimpanan `file://`; game tetap berjalan jika storage ditolak.

Dalam Gun Hit Arcade, pilih **V2** lalu **ZIP ↓** untuk mengunduh paket ini.
Implementasi in-app dan standalone memakai **`src/App.tsx` yang sama**.

### Kontrol

| Aksi | Kontrol |
| --- | --- |
| Tembak | Ketuk/klik arena atau **Spasi** |
| Pause/pengaturan | Tombol **⚙️**, **Escape**, atau back Android melalui host |
| Kembali/tutup halaman | Tombol kembali atau **Escape** |
| Navigasi tombol | Touch/mouse atau **Tab**, **Enter/Spasi** |

Tidak ada akun, leaderboard online, iklan, pembayaran, atau telemetri di Lite.

## Mengembangkan untuk proyek super v2

Pindahkan **seluruh folder `v2-perfect-shot/`**; tidak perlu menyalin folder v1.
Butuh Node **22.12+** dan npm untuk mengubah/membangun source:

```bash
npm ci
npm run dev       # 0.0.0.0:4280, preview .e2b.app diizinkan
npm test          # typecheck + 28 game/art/save + 17 UI/portable checks
npm run build    # dist/index.html, satu file siap main
npm run preview
npm run zip      # build + paket reproducible
```

Dua dependency runtime source adalah **React dan React DOM**, sudah dibundel ke
HTML. Dependency development/test tidak ikut hasil build atau ZIP sebagai
`node_modules`. `package-lock.json` disertakan untuk `npm ci`.

### Struktur ringkas

```text
src/App.tsx          alur asli/menu, lifecycle, pause, save terpisah
src/ui/Menu.tsx      markup menu v1, gambar Pistol asli
src/ui/GunPage.tsx   Armory v1, tepat satu kartu Pistol
src/ui/QuestMap.tsx  peta perspektif v1, tepat satu pilar level 1
src/game.ts          hanya fisika classic Pistol/level 1
src/levels.ts        data level 1, tanpa generator kampanye
src/weapons.ts       hanya Pistol + konstanta efek 9mm
src/art/             renderer Pistol/jeruk/hutan/wallet yang diperlukan
src/assets/          hanya jeruk, avatar, dua tile air, dua font + lisensi
src/persist.ts       schema/key Lite; stage selalu 1, weapon selalu pistol
src/render.ts        HUD/kanvas dengan geometri portrait v1 420×760
styles/              subset aturan CSS asli, bukan stylesheet semua halaman
scripts/styles.mjs   menghasilkan src/lite.css dengan scope .ps-lite
SOURCE-MAP.json      asal source/art v1 dan hash renderer Pistol asli
```

CSS dibatasi ke `.ps-lite` dan hanya ada selama komponen Lite terpasang, sehingga
kembali ke V1 tidak meninggalkan perubahan global pada tampilannya. Air Quest
memakai dua tile yang dipra-render dari SVG v1: tampilan dipertahankan tanpa
merasterisasi SVG blur yang mahal setiap frame. Pistol di menu cukup digambar
sekali; jeruk SVG v1 juga dirasterisasi sekali ke cache kanvas. Loop gameplay berhenti
saat pause, tab disembunyikan, atau host nonaktif.

Untuk menggabungkan ke aplikasi React lain, render default export `src/App.tsx`
dan muat `src/fonts.css` jika aplikasi tujuan belum memuat font v1. Prop `active`
mengatur lifecycle. Ref `LiteHandle.back()` menangani tombol back host. Pastikan
Vite mendeduplikasi React/React DOM apabila folder sumber memiliki instalasi
`node_modules` sendiri.
