# Rencana uji perangkat (QA)

Checklist ini untuk **tes di HP fisik** — bagian yang tidak bisa digantikan tes
otomatis atau emulator. Jalankan sekali sebelum setiap rilis, dan ulangi bagian
yang tersentuh perubahan.

- Waktu: ±90 menit untuk satu perangkat (semua bagian).
- Hasil dicatat di tabel §7 (boleh di issue GitHub atau spreadsheet).
- Bug yang ditemukan: tulis perangkat + langkah reproduksi + tangkapan layar.

---

## 1. Perangkat uji minimum

| Kelas | Contoh | Kenapa |
|---|---|---|
| Low-end | 2 GB RAM, Android 8/9 (Go/entry level) | uji frame drop, memori, cold start |
| Menengah | 4 GB RAM, Android 12 | perangkat mayoritas |
| Modern | 8 GB RAM, Android 14/15, 120 Hz | uji layar tinggi refresh & gesture |
| Layar lebar | tablet 10" atau HP lipat | layout portrait + safe area |
| Lama | Android 7/8 (min SDK) | API WebView lama |

Satu perangkat wajib **Android versi paling lama yang didukung**; sisanya
menengah dan modern.

## 2. Instalasi & pembaruan

- [ ] APK rilis (`release/GameArcadeHub-*.apk`) bisa dipasang dari file manager.
- [ ] Ikon launcher, nama "Game Arcade Hub", dan splash tampil benar (tidak ada
      ikon default Android di launcher).
- [ ] Buka pertama kali: intro SANS STUDIO selesai, tidak ada layar putih.
- [ ] Pasang versi lebih baru di atas versi lama: **progres, koin, senjata, dan
      pengaturan tetap ada** (uji migrasi simpanan, lihat `docs/SAVE-DATA.md`).
- [ ] Hapus lalu pasang ulang: mulai dari kondisi awal.
- [ ] Rotasi layar: tetap di mode portrait (tidak ikut memutar).
- [ ] Mode pesawat menyala: semua fitur tetap jalan (tidak ada jaringan).

## 3. Alur inti Game A (GUN HIT)

- [ ] Menu utama: tombol GUN / RANKS / READY / SETTING bereaksi, tanpa hantu.
- [ ] Mulai stage dari peta: transisi masuk mulus, HUD benar (level, koin, berilan).
- [ ] Tembak: ketuk = satu peluru, tahan = tembak otomatis.
- [ ] Stage selesai: banner CLEAR, koin bertambah, stage berikutnya terbuka.
- [ ] Stage bos: kepala bos sesuai nama di HUD (mis. PIRATE CAPTAIN), serangan
      kelihatan, HP berkurang, kalah → modal Boss Down → peti hadiah.
- [ ] Stage spesial (batu/bonus/harta): timer tampil dan habis dengan benar.
- [ ] Ganti senjata di Arsenal: senjata terpasang bertahan setelah app ditutup.
- [ ] Quest/misi & milestone: klaim menambah koin, tombol klaim hilang.
- [ ] PERINGKAT: daftar TOP RUNS terisi setelah satu run selesai.

## 4. Alur inti Game B (PERFECT SHOT)

- [ ] Semua layar berbahasa Inggris, tidak ada teks Indonesia tersisa.
- [ ] Quest map: pilih stage, main, kembali.
- [ ] Lempar pisau: hit, miss, dan wajib tepat sesuai aturan stage.
- [ ] Codex, achievement, dan shop terbuka tanpa error.

## 5. Pengaturan, bahasa, aksesibilitas

- [ ] Ganti bahasa ID ⇄ EN: teks berubah **tanpa reload** (menu, HUD kanvas,
      peta, quest, arsenal, pengaturan).
- [ ] Volume musik/efek: slider mengubah suara seketika; mute benar-benar senyap.
- [ ] Kecepatan permainan: pilihan tersimpan setelah app ditutup.
- [ ] Tema latar menu: pilihan tersimpan.
- [ ] CARA MAIN muncul di pemain baru, tidak muncul lagi setelah "selesai".
- [ ] RESET PROGRES: progres hilang, **pengaturan (bahasa/volume/tema) tetap**.
- [ ] Kebijakan privasi terbuka dari dalam game dan bisa digulir sampai akhir.

## 6. Ketahanan & performa

- [ ] Cold start ke menu < 5 s di perangkat low-end.
- [ ] Gameplay stabil ≥ 50 fps; tidak ada lonjakan memori terus-menerus
      (pantau di Android Studio Profiler atau `adb shell dumpsys meminfo`).
- [ ] Tekan Home di tengah run → kembali: game tidak melompat waktu, skor tidak
      berubah drastis, tidak crash.
- [ ] Kunci layar lalu buka: gambar tidak rusak (kanvas tergambar ulang).
- [ ] Tombol back Android: kembali satu lapis per tekan (modal → halaman → menu),
      dan keluar hanya dari menu utama.
- [ ] Putus data seluler / matikan Wi-Fi: tidak ada dialog error jaringan.
- [ ] Isi penyimpanan perangkat hampir penuh: game tetap bisa dibuka (simpanan
      gagal tidak boleh membuat layar putih).
- [ ] Main 15 menit nonstop: tidak ada panas berlebih/thermal throttling parah,
      baterai wajar.

## 7. Format catatan hasil

| Perangkat | Android | Bagian | Hasil | Catatan |
|---|---|---|---|---|
| Galaxy A05 | 13 | 2–6 | PASS | — |
| Redmi 9A | 10 | 2–6 | FAIL §6 | fps 38 saat bos: lihat #12 |
| Pixel 8 | 15 | 2–6 | PASS | — |

## 8. Yang tidak perlu diuji manual (sudah otomatis)

`npm test` (652 tes) dan `npx tsc --noEmit` di CI sudah mencakup: i18n lengkap,
migrasi simpanan + checksum, papan skor lokal, privasi/izin, telemetri no-op,
penamaan bos, alur menu, dan geometri peta. Jalankan `npm run build` sebelum
menyerahkan build ke penguji.

## 9. Rilis cepat (smoke 10 menit)

Kalau waktu sangat terbatas, minimal ini:

1. Pasang APK di satu perangkat menengah.
2. Main 1 stage biasa sampai selesai.
3. Main 1 stage bos sampai kalah/menang.
4. Ganti bahasa ke EN, cek menu + HUD gameplay.
5. Tutup app, buka lagi: progres & bahasa tersimpan.
6. Tekan back dari dalam permainan sampai keluar aplikasi tanpa macet.
