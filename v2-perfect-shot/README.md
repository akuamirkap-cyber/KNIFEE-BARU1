# PERFECT SHOT v2 — Full Arcade

V2 sekarang **game utuh, bukan lagi demo gameplay yang dipangkas**. Folder ini
berdiri sendiri dan bisa dipindahkan ke proyek lain. Game, artwork, menu, suara,
dan progres di sini juga dipakai langsung oleh tombol **V2** di Gun Hit Arcade.

**V1 tidak diganti atau dihapus.** File game v1 di `src/games/` tidak diubah oleh
pembaruan ini. Pemilih versi di aplikasi tetap default ke v1; hanya memilih V2
atau URL `?v=2` yang membuka versi ini.

## Yang sudah ada

- **30 level / 5 atmosfer**, dengan art buah, kayu, bola, permen, planet, UFO,
  mutiara, dan target mekanik. Setelah level 30, run masuk lap berikutnya.
- **3 boss**, di level 10, 20, dan 30. Pola boss: overdrive → rem palsu → reverse
  → freeze → jitter. Level biasa bergantian steady, wave, reverse, dan pulse.
- **10 senjata** dengan gambar launcher, proyektil, warna jejak, dan cooldown
  berbeda. Ranger, Iron Revolver, dan Longbow langsung tersedia. Tujuh sisanya
  dibuka dengan koin hasil bermain, bukan uang asli.
- **3 nyawa**, recovery singkat setelah tabrakan, dan +1 nyawa setelah boss
  clear (maksimal 3). Tabrakan pertama bukan lagi gameover instan.
- **Skor, combo hingga ×4, token koin berputar, PERFECT bonus, dan rating 1–3
  bintang** untuk setiap level.
- **Menu utama, Armory dengan preview, peta level, layar hadiah/gameover,
  retry, next level, pause, petunjuk, rekor lokal, dan 6 badge pencapaian.**
- **Efek impact, jejak proyektil, partikel, pecahan target, screen shake,
  recoil, dan SFX WebAudio**. Suara bisa dimatikan. Reduced-motion mengikuti
  preferensi perangkat.
- **Save lokal terpisah dari v1**: koin, gun yang dipakai, koleksi, rekor,
  level terbuka, bintang, statistik dan mute. Storage yang diblokir tidak
  membuat game gagal boot; game tetap bisa dimainkan dalam memori.

Semua laras berada di garis tengah target. Martian Ray menembakkan plasma
**hijau**. **Hanya Diamond Gun** yang menembakkan berlian.

Tidak ada akun, leaderboard online, iklan, IAP, file audio, gambar eksternal,
webfont, atau request jaringan saat bermain. **0 runtime dependencies.**

## Langsung main dari ZIP

1. Ekstrak arsipnya.
2. Buka **`v2-perfect-shot/dist/index.html`** di browser.
3. Tekan **MAIN SEKARANG**.

Build tersebut adalah **satu HTML mandiri**, termasuk CSS, JavaScript, artwork
prosedural dan sound engine. Tidak perlu menginstal paket untuk memainkan hasil
build. Save mengikuti origin/perangkat/browser; beberapa browser membatasi
persistensi pada `file://`, tetapi gameplay tetap berfungsi.

Di aplikasi Gun Hit, pilih **V2**. Tombol **ZIP ↓** pada pemilih versi mengunduh
arsip yang sama: source lengkap + build siap main + test + petunjuk ini.

## Kontrol & aturan

| Aksi | Kontrol |
| --- | --- |
| Tembak | Tap / klik arena, tombol tembak, **Space**, **↑**, atau **Enter** saat fokus arena |
| Jeda / kembali | **P**, **Esc**, tombol pause; tombol back Android ditangani host |
| Suara | **M** atau tombol speaker |
| Navigasi menu | Mouse/touch atau **Tab**, **Enter** / **Space** |

Selesaikan **10 hit bersih** untuk menghancurkan target. Jangan mengenai
proyektil yang sudah tertancap. Salah tembak mengurangi satu nyawa dan menghapus
combo, tetapi hit sebelumnya tetap dihitung. Saat tiga nyawa habis, run selesai.

- Skor hit: `100 × nomor level × multiplier`, dibulatkan.
- Multiplier: `1 + (combo − 1) × 0.25`, maksimal `4`.
- Hit memberi **1 koin**. Mengenai token emas memberi **+5 koin +250 skor**.
- Clear memberi **25 koin +200 × level skor**.
- PERFECT (tanpa tabrakan di level itu) menambah **40 koin +500 × level skor**.
- Boss clear menambah **30 koin +500 × level skor**, serta memulihkan satu nyawa.
- Rating: 3 bintang tanpa tabrakan, 2 jika sekali tabrakan, 1 jika dua kali.

Next level mempertahankan skor, combo, koin run, dan nyawa. Retry atau memilih
level dari peta memulai run baru dengan tiga nyawa; wallet dan unlock tetap
aman. **Posisi target / run yang sedang berjalan tidak disimpan saat reload**;
yang tersimpan adalah progres, statistik dan koleksi.

## Menjalankan source

Butuh **Node.js 22.12+** dan npm. Python 3 hanya dibutuhkan untuk membuat ZIP.

```bash
cd v2-perfect-shot
npm ci
npm run dev          # 0.0.0.0:4280
npm test             # typecheck + rules/render proof + real-shell smoke
npm run build        # dist/index.html, satu file offline
npm run preview      # preview build pada port 4280
npm run zip          # build + perfect-shot-v2.zip (source dan dist)
```

Jangan menjalankan dev dan preview pada port yang sama secara bersamaan.
Konfigurasi menerima host preview `*.e2b.app`; kode browser tidak memanggil
`localhost` atau service eksternal.

### Pengujian

```bash
npm run proof -- /tmp/psv2-full
npm run smoke -- /tmp/psv2-smoke
```

**30 proof checks** memeriksa aturan, lima pola putaran, keterjangkauan semua
stage, collision, recovery, bonus, coin accounting, lap, transaksi Armory,
normalisasi save, fallback audio, serta cache bitmap. Test juga menggambar frame
PNG nyata dari engine dengan Skia, termasuk boss, plasma hijau, Diamond Gun,
proyektil terbang, dan target pecah.

**22 shell smoke checks** mem-boot `src/main.ts` yang sebenarnya dengan DOM
linkedom dan canvas Skia. Test menekan pointer/keyboard, membuka menu, membeli dan
memakai senjata, memeriksa next-level / rewards / locked map / persistensi,
background pause, serta cleanup. Tidak membutuhkan browser terpasang.

Di repository induk, `tests/perfect-shot-v2.test.ts` menambah regresi pemilihan
versi, isolasi v1, integrasi host, progression dan Armory pada `npm test`.
Screenshot QA dan `node_modules` tidak masuk ZIP.

## Susunan source

```text
src/
  config.ts             ukuran board, toleransi, scoring, palette
  levels.ts             campaign, curve kesulitan, lima pola putaran
  weapons.ts            katalog 10 senjata dan harga
  game.ts               rules & event queue; tanpa DOM / audio / storage
  juice.ts              pool partikel dan teks mengambang yang dibatasi
  audio.ts              synthesizer SFX, unlock/mute/suspend/cleanup
  persist.ts            validasi save & transaksi koin; satu key khusus v2
  render/
    primitives.ts       operasi gambar bersama
    targets.ts          artwork target asli, bukan gambar dari v1
    weapons.ts          launcher dan proyektil yang selalu terpusat
    cache.ts            LRU sprite terbatas 24 MiB, dengan factory canvas
    draw.ts             satu frame dari Scene; tanpa ketergantungan DOM
    attach.ts           canvas, DPR, letterbox, input, rAF, callbacks
  ui/
    arcade.ts           seluruh menu & lifecycle yang dipakai kedua host
    styles.ts           CSS ter-scope .ps-v2 agar tidak merusak v1
    icons.ts            ikon SVG inline
  main.ts               entry point standalone
proof.ts                rules + frame PNG
smoke.ts                integrasi page/DOM
package.py              ZIP reproducible dengan whitelist file
```

Board berukuran **480 × 960**. Host menyesuaikan skala dan letterbox, tidak
meregangkan geometri collision. Artwork vector diraster sekali lalu dipakai
ulang melalui cache terbatas; tidak ada redraw ratusan path statis setiap frame.
DPR dibatasi 2, partikel 300, dan event queue 64. Satu loop rAF dimatikan ketika
tab tersembunyi, host nonaktif, atau modal dibuka. Setiap unmount membersihkan
loop, listener, cache, timer toast, observer, dan AudioContext.

## Memasukkan ke proyek lain

### Pakai game lengkap

```ts
import { createArcade } from './perfect-shot/src/ui/arcade';

// Container harus punya lebar dan tinggi, misalnya 100% dari parent.
const arcade = createArcade(document.querySelector<HTMLElement>('#game')!);

// Host native / React boleh membekukan seluruh UI:
arcade.setActive(false);  // run otomatis dijeda
arcade.setActive(true);   // pemain tetap memilih LANJUTKAN
arcade.back();            // jeda / tutup panel; false ketika sudah di home

// Unmount:
arcade.destroy();
```

### Pakai engine saja

```ts
import { mount } from './perfect-shot/src/render/attach';

const driver = mount(document.querySelector('canvas')!, {
  weapon: 'knife',
  onEvent(event, game) {
    // Host dapat membaca land/miss/clear untuk audio dan save sendiri.
  },
  onEnd(outcome, game) {
    // Callback setelah animasi selesai, sekali per level.
    if (outcome === 'win') game.nextLevel();
    else game.restart();
  },
});

// Ketika meninggalkan layar:
driver.destroy();
```

`Game` dan `draw(ctx, scene)` juga bisa dipakai tanpa halaman sama sekali.
Renderer menerima cache opsional dengan factory, sehingga kompatibel dengan
Canvas browser dan Skia tanpa membaca `document`.

### Save

Satu key: **`perfect-shot.v2.save`**. Tidak ada akses ke key game v1. Data dibaca
defensif: koin negatif/NaN ditolak, senjata tidak dikenal disaring, tiga senjata
gratis selalu tersedia, dan gun terkunci tidak bisa dipakai lewat save parsial.

### Membuat ulang ZIP untuk host

```bash
npm run build
python3 package.py ../public/perfect-shot-v2.zip
```

Hanya source yang diperlukan, lockfile, dokumentasi, test dan `dist/index.html`
yang masuk arsip. Tidak menyertakan dependensi terpasang atau file proyek v1.
