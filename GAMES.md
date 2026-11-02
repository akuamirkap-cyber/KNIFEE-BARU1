# Satu game di repo ini — GUN HIT (SGA)

Repo ini sekarang berisi **satu game saja**: **Game A — GUNHIT / SGA**.

> **Game B — PERFECT SHOT sudah dihapus** sebagai game yang bisa dimainkan.
> Gameplay, menu, toko, kodeks, dan layar Game B tidak ada lagi di aplikasi.
> Yang tersisa hanyalah **aset visual & audio bersama** di
> `src/games/perfect-shot/**` (wajah target, art senjata, ikon, sfx, tema,
> `index.css`) yang memang dipakai Game A — folder itu **tidak** boleh dihapus.

| Nama | Kode | Pemilik tampilan |
| --- | --- | --- |
| **Game A — GUNHIT** | `src/games/gunhit/**` | Satu-satunya game: canvas 420×760, menu `PERFECT SHOT`, arsenal, quest, rank, pengaturan, peta level, 100 stage + 11 bos. |
| **Aset bersama (bekas Game B)** | `src/games/perfect-shot/**` | Bukan game lagi: `play/{HeadArt,TargetArt,TargetArt2,levels}`, `ui/{FlatIcons,GameIcons}`, `audio/{sfx,useSound}`, `anim/*`, `quest/data`, `ach/data`, `rank/*`, `shop/{timeline,weapons}`, `theme/*`, `gift/*`, `components/TransitionOverlay`, `index.css`. |

## Aturan penyebutan

- Sebut **"Game A"** atau **"GUNHIT"** untuk aplikasi/gameplay. Jangan pakai
  "game 1 / game 2" dan jangan menyebut Game B sebagai fitur yang masih ada.
- Kalau menyebut art yang berasal dari Game B, bilang **"art bersama"**
  (mis. "wajah bos dari art bersama `play/HeadArt`").
- Referensi visual mentah tetap tersimpan di `references/`
  (`main-menu-transition-animations.zip`, `2d-game-intro-animation.zip`,
  `2d-game-intro-animation (1).zip`) — hanya arsip, bukan bagian aplikasi.

## Label yang terlihat di aplikasi

Intro **SANS STUDIO** lalu langsung menu Game A. Tidak ada top nav pemilih game
lagi; satu-satunya penanda di shell adalah
`data-game-id="A"` + `data-game-name="GUNHIT"` + `aria-label="Gun Hit SGA"`
(`src/App.tsx`), supaya otomasi (screenshot, test, console) tetap punya pegangan.

## Onboarding & pengaturan Game A

Halaman **PENGATURAN** di Game A punya tiga hal tambahan di atas tombol
kebijakan privasi:

- **BAHASA** — pilihan `ID` / `EN`. Pilihan disimpan di `sga.language.v1` dan
  langsung dipakai teks-teks baru (CARA MAIN, dialog reset, seksi pengaturan).
  Ekstraksi seluruh teks gameplay ke katalog ada di `src/i18n/catalog.ts`
  (Part 8), dan seluruh teks baru harus masuk katalog itu.
- **❓ CARA MAIN** — layar 7 langkah (sentuh untuk menembak; senjata scope/charge
  ditahan lalu dilepas; pantulan, musuh garis, mode bos, koin/berlian, naik
  level). Tampil **otomatis sekali** saat pertama kali menu siap
  (`sga.onboarding.v1`), lalu bisa dibuka kapan pun dari Pengaturan. Esc / tombol
  back menutupnya.
- **🗑 RESET PROGRES** — konfirmasi dua langkah (dialog `alertdialog`, tombol
  "BATAL" / "YA, HAPUS"), menghapus 11 kunci progres `gunhit_*` (best score,
  level, koin, berlian, senjata, quest, XP, level pemain, stage terbuka) lalu
  memuat ulang aplikasi. Pengaturan (volume, kecepatan, tema, bahasa, penanda
  CARA MAIN) sengaja dipertahankan.

Tombol back Android menutup dengan prioritas: **CARA MAIN → konfirmasi reset →
kebijakan privasi → pengaturan → (saat main) pause → (di layar hasil) menu →
keluar aplikasi**.

## Catatan teknis pasca-penghapusan Game B

- `src/App.tsx` hanya me-mount satu pane; `useAndroidBack` di level shell tidak
  lagi dipakai untuk berpindah game, hanya meneruskan back ke sistem.
- `.game-pair` / `.game-pane` sudah dihapus dari `src/index.css`.
- Kunci penyimpanan lama `perfect-shot-save-v1` **sengaja dipertahankan**
  (`src/games/knife-hit/progress.ts`) supaya simpanan pemain versi lama tidak
  hilang saat upgrade.
