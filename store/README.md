# Aset toko (`store/`)

Semua yang perlu diunggah ke Play Console, plus cara membuatnya ulang.

| Berkas | Ukuran | Dipakai untuk |
|---|---|---|
| `icon-512.png` | 512×512 PNG | App icon (hi-res) Play Console |
| `feature-graphic-1024x500.png` | 1024×500 PNG | Feature graphic (wajib) |
| `screenshots/phone-01…04.png` | 1080×1920 PNG | Screenshot ponsel (minimal 2, maksimal 8) — satu game saja, tidak ada pane Game B |
| `listing-id.md`, `listing-en.md` | — | Nama, deskripsi singkat, deskripsi lengkap, “yang baru” |
| `fonts/*.ttf` | — | Font yang dipakai saat merender (OFL, lihat `fonts/LICENSE.md`) |

## Membuat ulang

```bash
npx tsx tools/make-store-assets.ts      # tulis ulang semua aset di atas
```

Yang dirender **bukan mockup**: `tools/make-store-assets.ts` menjalankan mesin
game yang sebenarnya (`Game` di atas kanvas Skia `@napi-rs/canvas`), mengambil
satu frame, lalu menempelkannya ke latar pemasaran. Artwork roda dan kepala bos
diambil dari komponen art bersama (`TargetArt`) yang dirasterisasi ke SVG → PNG, jadi
bos yang tampil di screenshot adalah bos yang sama dengan di aplikasi.

Karena itu:

- `Math.random` dipaku (seed tetap) supaya aset tidak berubah tiap dijalankan;
- `store/fonts/` menyimpan Bungee, Russo One, dan Fredoka dalam format TTF
  (hasil konversi dari paket `@fontsource`), karena renderer offline tidak bisa
  membaca WOFF2;
- latar, judul, dan keterangan ditambahkan oleh skrip; isi layar ponsel adalah
  render engine apa adanya.

## Syarat Play Console yang sudah dicek

| Syarat | Status |
|---|---|
| Ikon 512×512, 32-bit PNG, tanpa alpha | ✅ `icon-512.png` |
| Feature graphic 1024×500, PNG/JPEG | ✅ `feature-graphic-1024x500.png` |
| Screenshot ponsel 2–8, rasio 16:9–9:16, sisi pendek ≥ 1080 | ✅ 4 × 1080×1920 |
| Screenshot tablet 7"/10" | ➖ belum ada (game portrait, phone-first) |
| Video promosi | ➖ opsional, bukan syarat |
| Kebijakan privasi (URL publik) | ➖ perlu hosting sendiri, isi dari `docs/PRIVACY.md` |

`tests/store-assets.test.ts` menjaga hal-hal yang tidak boleh meleset: ukuran
gambar, batas panjang nama/deskripsi, dan fakta bahwa setiap screenshot
benar-benar 1080×1920 tanpa alpha.
