# Firework 8-Gun — sumber yang masih dipakai SGA

Slide Firework 8-Gun sudah dihapus dari hub (dulu SLIDE 02), jadi `index.html`,
`main.tsx`, `App.tsx` dan konfigurasi Vite-nya juga ikut dihapus.

Dua file ini sengaja **tetap ada** karena senjata hasil port slide ini di Gun Hit
Arcade (kartu desain/efek **"Firework"**) masih memakainya:

- `src/game/sfx.ts` — mesin suara asli; diimpor oleh
  `src/games/gunhit/game/slide2Audio.ts`.
- `src/game/engine.ts` — mesin asli; dipakai sebagai acuan paritas oleh
  `tests/gunhit-firework-slide2.test.ts` dan `tools/set-two-*.ts`.

Jangan hapus folder ini kecuali impor-impor di atas sudah dipindahkan.
