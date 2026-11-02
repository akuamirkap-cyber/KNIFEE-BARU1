# Data Safety — jawaban untuk Play Console

Dokumen ini berisi jawaban siap-pakai untuk bagian **App content → Data safety**
di Play Console, beserta alasannya. Semua jawaban di bawah ini sesuai dengan isi
aplikasi saat ini (lihat `docs/PRIVACY.md` dan `src/legal/privacyPolicy.ts`).

> **Aturan penting Play:** data yang hanya diproses **di perangkat** dan tidak
> pernah dikirim keluar dari HP **bukan** "collected" atau "shared". Game ini
> menyimpan progres di localStorage/IndexedDB di dalam sandbox aplikasi dan tidak
> mengirim apa pun ke server. Karena itu seluruh jawaban "data types" di bawah
> adalah **No**.

---

## 1. Data collection and security

| Pertanyaan Play Console | Jawaban | Alasan |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | Tidak ada akun, tidak ada server, tidak ada SDK analitik/iklan/crash reporter. Semua progres hanya di perangkat. |
| Is all of the user data collected by your app encrypted in transit? | **Tidak berlaku (N/A)** | Tidak ada data yang dikirim keluar perangkat. Form biasanya melewati pertanyaan ini kalau jawaban sebelumnya "No". |
| Do you provide a way for users to request that their data is deleted? | **Ya** (kalau ditanya) | Pemain bisa menghapus semua data dengan Setelan Android → Aplikasi → Game Arcade Hub → Penyimpanan → **Hapus data**, atau uninstall aplikasi. Tidak ada data di server yang perlu dihapus. |

## 2. Data types (semua **No**)

Isi "No" untuk semua jenis data berikut — jangan ada yang dicentang:

| Kategori Play | Contoh data | Jawaban |
|---|---|---|
| Location | perkiraan lokasi, lokasi presisi | **No** |
| Personal info | nama, email, alamat, nomor telepon, ID pengguna, tanggal lahir | **No** |
| Financial info | info pembayaran, riwayat pembelian | **No** |
| Health and fitness | kesehatan, kebugaran | **No** |
| Messages | SMS, email, pesan dalam aplikasi | **No** |
| Photos and videos | foto, video | **No** |
| Audio files | rekaman suara, musik milik pengguna | **No** |
| Files and docs | file pengguna | **No** |
| Calendar | acara kalender | **No** |
| Contacts | kontak | **No** |
| App activity | interaksi dalam aplikasi, riwayat pencarian, konten yang dilihat | **No** |
| Web browsing | riwayat halaman web | **No** |
| App info and performance | log crash, diagnostik, data performa | **No** — tidak ada crash reporter |
| Device or other IDs | ID perangkat, ID iklan | **No** — izin `AD_ID` tidak dipakai |

## 3. Security practices

| Pertanyaan | Jawaban |
|---|---|
| Data dienkripsi saat transit | N/A (tidak ada transmisi) |
| Data dienkripsi saat disimpan | N/A (data lokal berupa progres game, bukan data pribadi) |
| Menyediakan cara menghapus data | **Ya** — "Hapus data" di setelan Android atau uninstall |
| Commit ke Play Families policy | Hanya kalau target audiens memilih usia di bawah 13 (lihat `docs/CONTENT-RATING.md`) |
| Independently validated security practices | Tidak |
| Data digunakan untuk iklan | Tidak ada iklan |

## 4. App content lain yang berhubungan

| Bagian Play Console | Jawaban |
|---|---|
| Privacy policy | **Wajib ada URL publik.** Isi `docs/PRIVACY.md` (upload ke GitHub Pages / Google Sites / Notion publik), lalu tempel URL-nya. |
| Ads | **No ads** |
| App access | **All functionality is available without special access** (tidak ada login) |
| Content rating | Lihat `docs/CONTENT-RATING.md` |
| Target audience | Rekomendasi: **13+** (paling sederhana, tidak memicu Families policy). Bisa juga semua umur kalau kamu siap memenuhi kebijakan Families. |
| News app | No |
| COVID-19 contact tracing / status app | No |
| Government app | No |
| Financial features | No |
| Health apps | No (bukan aplikasi kesehatan) |
| Advertising ID | **Tidak dipakai** — tidak ada izin `com.google.android.gms.permission.AD_ID` |
| In-app purchases | **Tidak ada** pembelian nyata (koin/diamond hanya didapat dari bermain) |
| Loot box | Ada hadiah **acak** dari peti (senjata hadiah) memakai mata uang dalam game yang **tidak bisa dibeli dengan uang nyata**. Kalau Play menanyakan "randomized virtual items", jawab **Ya** dan jelaskan: gratis, dari gameplay. |

## 5. Yang harus kamu lakukan

1. Upload `docs/PRIVACY.md` ke URL publik (GitHub Pages paling cepat:
   buat repo publik → settings → Pages → arahkan ke folder `docs/`).
2. Buka Play Console → App content → **Privacy policy** → tempel URL itu.
3. Isi **Data safety** persis seperti tabel di atas.
4. Isi **Ads = No**, **App access = semua fitur terbuka**.
5. Isi **Content rating** sesuai `docs/CONTENT-RATING.md`.
6. Simpan, lalu cek ringkasan Data safety yang ditampilkan Play — harus berbunyi
   "No data collected" dan "No data shared".

## 6. Kalau nanti ada fitur baru

Setiap fitur yang mengirim data (leaderboard online, analitik, iklan, crash
reporting) **mengubah jawaban di atas**. Saat itu:
perbarui `src/legal/privacyPolicy.ts` → `npm run docs:privacy` → ulangi Data safety
→ rilis. Jangan menambah SDK pengirim data tanpa memperbarui kebijakan lebih dulu.
