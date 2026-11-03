# Satu game di repo ini — GUN HIT (SGA)

Repo ini sekarang berisi **satu game saja**: **Game A — GUNHIT / SGA**.

> **Game B — PERFECT SHOT sudah dihapus** sebagai game yang bisa dimainkan.
> Gameplay, menu, toko, kodeks, dan layar Game B tidak ada lagi di aplikasi.
> Yang tersisa hanyalah **aset visual & audio bersama** di
> `src/games/perfect-shot/**` (wajah target, art senjata, ikon, sfx, tema,
> `index.css`) yang memang dipakai Game A — folder itu **tidak** boleh dihapus.

| Nama | Kode | Pemilik tampilan |
| --- | --- | --- |
| **Game A — GUNHIT** | `src/games/gunhit/**` | Satu-satunya game: canvas 420×760 (potret) / 760×420 (landscape), menu `PERFECT SHOT`, arsenal, quest, rank, pengaturan, peta level, 100 stage + 11 bos. |
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
- **MODE TAMPILAN** — pilihan `📱 POTRET` / `🎮 LANDSCAPE`, tepat di bawah TEMA
  LATAR (jadi terlihat tanpa membuka PENGATURAN LANJUTAN) dan juga ada di
  pengaturan jeda dalam game. Pilihan disimpan di `gunhit_orientation`
  (bawaan `portrait`) dan **sengaja dipertahankan** saat RESET PROGRES
  (`src/storage/resetProgress.ts` → `SETTINGS_KEYS_KEPT`). Detail: bagian
  *Mode tampilan* di bawah.
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

## Mode tampilan: POTRET ↔ LANDSCAPE

Gameplay Game A punya dua mode tampilan. **Landscape bukan level baru**: dunia
420×760 yang sama digambar diputar seperempat putaran, jadi hitbox, art, timing,
skor, dan 100 stage-nya identik — yang berubah hanya arah bidik.

- **📱 POTRET** (bawaan) — kanvas 420×760, senjata di bawah tengah menembak ke
  atas, roda/musuh di atas.
- **🎮 LANDSCAPE** — kanvas 760×420, **senjata berdiri di tepi kiri dan menembak
  ke kanan**, **roda/musuh pindah ke tepi kanan**; keduanya segaris di tengah
  tinggi layar (`worldToView(210,560) → (200,210)` untuk pangkal senjata,
  `worldToView(210,184) → (576,210)` untuk roda).

| Bagian | Berkas | Isi |
| --- | --- | --- |
| Geometri | `src/games/gunhit/game/layout.ts` | `PORTRAIT_VIEW` / `LANDSCAPE_VIEW`, `viewSize`, `worldToView` / `viewToWorld`, `baseViewTransform(k, landscape)` → `setTransform(0,k,-k,0,k*H,0)`, `UPRIGHT_SPIN = -π/2`. |
| Pilihan pemain | `src/games/gunhit/game/orientation.ts` | kunci `gunhit_orientation`, `SGA_ORIENTATION_OPTIONS`, `frameForOrientation`, plus bingkai shell aktif (`PORTRAIT_FRAME` 420×760 / `LANDSCAPE_FRAME` 760×420) lewat `setActiveShellFrame` / `subscribeActiveShellFrame`. |
| Hook | `src/games/gunhit/utils/useSgaOrientation.ts` | pola yang sama dengan `useSgaGameSpeed`. |
| Engine | `src/games/gunhit/game/Game.ts` | `setOrientation` / `isLandscape`, `applyViewTransform`, `toView`, `uprightSpin`, `applyWheelSpin`, `hudLayout()` + `drawHUD` per mode, input lewat `viewToWorld`. |
| Shell | `src/App.tsx` + `src/components/ScaledFrame.tsx` | letterbox mengikuti `shellFrame` (`baseWidth={shellFrame.width}`), penanda `data-shell-orientation`. |
| Perangkat | `src/utils/screenOrientation.ts` | `requestScreenOrientation('landscape' \| 'portrait')`: lazy `@capacitor/screen-orientation` di native, `screen.orientation.lock` di browser, semua error ditelan. |
| Modal | `src/games/gunhit/components/FitLandscape.tsx` | pembungkus skala-otomatis untuk modal gameplay (bos kalah, buff bintang, kotak hadiah, pengaturan jeda) supaya muat di layar pendek. |

Aturan yang dijaga:

- **Hanya gameplay yang berputar.** `landscapeGameplay = orientation ===
  'landscape' && screen === 'playing'` (`src/games/gunhit/App.tsx`), jadi menu,
  arsenal, quest, toko, dan layar hasil tetap potret; shell dikembalikan ke
  `PORTRAIT_FRAME` begitu keluar dari game (termasuk saat unmount).
- **Teks selalu tegak** menghadap pembaca di kedua mode: callout damage, petunjuk
  scope, isi magasin, label senjata, dompet, banner, `STAGE CLEAR`, dan reaksi
  bos digambar lewat `uprightSpin()` atau langsung di ruang layar. Kepala bos
  ikut tegak (`this.rot = UPRIGHT_SPIN` saat landscape) sehingga selalu menghadap
  pemain. Ukiran yang memang tertancap di papan/laras (nama senjata, badge
  berlian `2x`) tetap ikut berputar bersama papannya — sama seperti di potret.
- **Potret tidak berubah sedikit pun.** Semua perilaku landscape bercabang
  eksplisit (`if (this.landscape)`, `if (lensRot)`), jadi angka HUD lama, `rot 0`
  untuk bos, dan piksel efek lensa di potret tetap identik byte-per-byte.
- `android/app/src/main/AndroidManifest.xml` **sengaja tetap** `portrait`;
  putaran diminta saat runtime oleh plugin, supaya aktivitas lain (splash, menu)
  tidak ikut berputar dan kunci rilis tidak berubah.
- Label & deskripsi opsi (`MODE TAMPILAN`, `POTRET`, kalimat petunjuk landscape)
  punya padanan EN di `src/i18n/strings.ts`.
- Dijaga `tests/gunhit-landscape-mode.test.ts` (geometri putaran, arah peluru,
  fase kepala bos, tata letak HUD, teks tegak & di dalam layar, shell, plugin
  Android, terjemahan).

## Catatan teknis pasca-penghapusan Game B

- `src/App.tsx` hanya me-mount satu pane; `useAndroidBack` di level shell tidak
  lagi dipakai untuk berpindah game, hanya meneruskan back ke sistem.
- `.game-pair` / `.game-pane` sudah dihapus dari `src/index.css`.
- Kunci penyimpanan lama `perfect-shot-save-v1` **sengaja dipertahankan**
  (`src/games/knife-hit/progress.ts`) supaya simpanan pemain versi lama tidak
  hilang saat upgrade.
