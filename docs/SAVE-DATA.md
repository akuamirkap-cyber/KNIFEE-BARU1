# Simpanan & papan skor

Dokumen ini menjelaskan apa yang ditulis game ke perangkat, bagaimana data lama
diurus saat versi skema berubah, dan keputusan **papan skor lokal** (tanpa server).

Ringkasan:

- Semua progres ada di `localStorage` perangkat. Tidak ada akun, tidak ada server,
  tidak ada data yang dikirim (lihat `docs/PRIVACY.md`).
- Setiap simpanan punya **versi skema** dan **checksum**.
- Data versi lama **dimigrasi**, bukan dibuang.
- Data rusak/diedit **diperbaiki jadi nilai yang masuk akal**, tidak pernah
  ditampilkan mentah dan tidak pernah membuat layar kosong.
- Papan skor (`PERINGKAT`) berisi **sepuluh run terbaik pemain sendiri**, lokal.

---

## 1. Kunci yang disimpan

| Kunci | Isi | Dijaga |
|---|---|---|
| `gunhit_best` | skor tertinggi | versi + checksum |
| `gunhit_best_level` | stage tertinggi terbuka (min. 1) | versi + checksum |
| `gunhit_coins`, `gunhit_diamonds` | saldo | versi + checksum |
| `gunhit_weapon` | senjata terpasang (id yang dikenal) | versi + checksum |
| `gunhit_owned_weapons`, `gunhit_rare_owned` | koleksi (JSON array id) | versi + checksum |
| `gunhit_quests_state` | progres misi & achievement (JSON) | versi + checksum |
| `gunhit_player_xp`, `gunhit_player_level` | level pemain | versi + checksum |
| `gunhit_all_stages_open` | mode buka-semua (`1`/`0`) | versi + checksum |
| `gunhit_runs_v1` | 10 run terbaik (papan skor) | versi + checksum |
| `gunhit_save_meta` | versi skema + sidik jari progres | — (meta) |
| `gunhit_volume`, `gunhit_game_speed`, `gunhit_menu_theme`, `sga.language.v1`, `sga.onboarding.v1` | pengaturan | tidak ikut reset progres |

`gunhit_save_meta` menyimpan:

```json
{ "v": 2, "c": "1f3c9ab2", "d": { "version": 2, "digest": "9ab31c07", "updatedAt": "2026-11-02T04:00:00.000Z" } }
```

`digest` adalah checksum dari seluruh kunci progres (`kunci=nilai`, urut, di-hash
FNV-1a 32-bit).

---

## 2. Versi skema & migrasi

| Versi | Isi | Langkah masuk |
|---|---|---|
| 0 | simpanan lama, tanpa meta | — |
| 1 | nilai dirapikan (angka bulat, senjata dikenal, koleksi bersih) | `MIGRATIONS[0]` |
| 2 | sama seperti v1 + `gunhit_save_meta` berisi checksum | `MIGRATIONS[1]` |

Cara kerja `migrateSave()` (`src/storage/saveState.ts`), dipanggil **sekali sebelum
layar pertama membaca progres**:

```
baca gunhit_save_meta
├─ tidak ada & tidak ada progres      → fresh        (catat meta, tidak mengarang nilai)
├─ versi lebih baru (downgrade)       → reset-for-downgrade (progres tidak disentuh)
├─ versi lama                          → jalankan MIGRATIONS[v…]  → migrated
└─ ada, versi sama                     → bandingkan checksum
                                        ├─ sama            → current
                                        └─ beda            → rapikan nilai
                                                            ├─ ada yang berubah → repaired
                                                            └─ tidak ada        → current (sidik jari diperbarui)
```

Hasilnya dilaporkan sebagai event `save_state` (lihat `docs/ANALYTICS.md`), jadi
kalau ada perangkat yang kehilangan progres, kelihatan di funnel, bukan cuma
dari keluhan pemain.

Aturan memperbaiki nilai:

| Data | Aturan |
|---|---|
| angka | dibulatkan, ≥ 0, maksimal 1.000.000.000; `NaN`/`Infinity` → 0 |
| `gunhit_best_level` | minimal 1 |
| `gunhit_weapon` | id yang tidak dikenal → `pistol` |
| koleksi | hanya id senjata yang ada di `weapons.ts`, sesuai rarity kuncinya, tanpa duplikat |
| `gunhit_quests_state` | hanya id misi/milestone yang dikenal; angka aneh → 0; JSON rusak → kunci dibuang (default dipakai) |

Bila `gunhit_save_meta` ditulis aplikasi versi lebih baru (pemain membuka APK
lama), progres **tidak** ditimpa skema lama — hanya dirapikan.

### Menambah versi baru

1. naikkan `SAVE_VERSION` di `src/storage/saveState.ts`;
2. tambahkan `MIGRATIONS[versiLama]` yang mengubah data ke bentuk baru;
3. tambahkan kasus di `tests/save-migration.test.ts` (data lama → hasil baru);
4. perbarui tabel di dokumen ini.

---

## 3. Keputusan: papan skor lokal, bukan online

**Keputusan: leaderboard tetap lokal (offline).** Tidak ada backend, tidak ada
akun, tidak ada unggah skor.

Alasan:

1. **Game ini offline-first.** Satu APK, tanpa login, bisa dimainkan di pesawat.
   Papan online memaksa identitas pemain → butuh server, moderasi nama, dan
   kebijakan data baru.
2. **Tanpa anti-cheat, papan online tidak lebih jujur.** Skor palsu cuma pindah
   dari HP pemain ke server. Yang benar-benar bisa dijamin hanya: rekor lokal
   yang tidak bisa muncul sebagai "rekor" kalau datanya diedit.
3. **Rating 3+ dan target pemain anak.** Mengumpulkan nama + skor anak ke server
   adalah risiko privasi yang tidak sepadan untuk sebuah game kasual.
4. **Tidak ada biaya operasional.** Tidak ada server yang bisa mati, tidak ada
   kuota, tidak ada tagihan.

Yang ditampilkan di layar `PERINGKAT`:

- sepuluh run terbaik pemain (`skor`, `stage`, `koin`, waktu) dari `gunhit_runs_v1`;
- baris pemain sendiri selalu ada, diurutkan bersama run tersebut;
- label `TOP RUNS · OFFLINE` supaya jelas papan ini milik perangkat ini;
- Game B sudah dihapus, jadi `SIMULATED RIVALS · OFFLINE` tidak pernah tampil
  lagi; layar `PERINGKAT` hanya berisi run pemain di perangkat ini.

Kalau suatu hari papan online diinginkan, urutan kerjanya: layanan backend
terpisah → identitas anonim (bukan nama asli) → moderasi nama → pembaruan
`docs/PRIVACY.md` + Data safety + `docs/CONTENT-RATING.md` dalam rilis yang sama.

---

## 4. Reset progres

`RESET PROGRES` menghapus 13 kunci progres, termasuk `gunhit_runs_v1` dan
`gunhit_save_meta`. Pengaturan (volume, kecepatan, tema, bahasa, status CARA
MAIN) **tidak** dihapus — lihat `src/storage/resetProgress.ts`.

---

## 5. Berkas terkait

| Berkas | Isi |
|---|---|
| `src/storage/saveBlob.ts` | checksum, bungkus `{v,c,d}`, `readBlob`, `migrateValue` |
| `src/storage/saveState.ts` | `SAVE_VERSION`, `MIGRATIONS`, `migrateSave`, `bootSave`, `flushSaveMeta` |
| `src/storage/leaderboard.ts` | `readRuns`, `recordRun`, `writeRuns`, `bestRun` |
| `src/storage/resetProgress.ts` | daftar kunci progres vs pengaturan |
| `tests/save-migration.test.ts` | 17 tes: checksum, migrasi, perbaikan, papan skor, urutan boot |
