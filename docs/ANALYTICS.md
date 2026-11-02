# Telemetri & crash reporting

Game ini **tidak mengirim data apa pun**. Lapisan telemetri di bawah ini sengaja
dibuat "plug-and-play": semua event sudah dipanggil di tempat yang benar, tetapi
sink-nya kosong (`null`) sampai kamu memasangnya sendiri.

```
event  →  src/telemetry/analytics.ts  →  sink (default: tidak ada = no-op)
                     │
                     ├─ recentEvents()  → 40 event terakhir di memori (untuk bug report)
                     └─ session/retention lokal (src/telemetry/session.ts)
```

- `docs/PRIVACY.md` dan `docs/DATA-SAFETY.md` menyatakan **no data collected**.
  Itu benar selama sink belum dipasang. Lihat bagian "Kalau memasang sink" di bawah.
- `tests/telemetry.test.ts` mengunci dua hal: default **no-op**, dan modul
  telemetri tidak pernah melakukan panggilan jaringan.

---

## 1. Event yang sudah terpasang

| Event | Kapan | Properti |
|---|---|---|
| `session_start` | app dibuka (sekali per launch) | `session_index`, `days_since_install`, `days_played`, `returning_d1`, `returning_d7`, `returning_d30`, `app_version` |
| `stage_start` | sebuah stage mulai (menu, peta, atau ulang) | `stage`, `mode`, `weapon`, `boss`, `cleared_this_run` |
| `stage_clear` | stage selesai | `stage`, `boss`, `cleared_this_run`, `run_ms` |
| `run_end` | run selesai | `outcome` (`game_over` \| `abandoned`), `stage`, `score`, `coins`, `cleared`, `run_ms`, `weapon`, `mode` |
| `save_state` | app dibuka, setelah migrasi simpanan | `status` (`fresh` \| `current` \| `migrated` \| `repaired` \| `reset-for-downgrade`), `from_version`, `to_version`, `repaired` (jumlah kunci), `repaired_keys` |
| `error` | error global / promise / React boundary | `source` (`window` \| `promise` \| `react-boundary`), `message`, `file`, `line`, `column`, `where`, `component` |

Semua event otomatis diberi `t` (timestamp) dan `session` (id per launch).

Funnel yang bisa dibaca dari event di atas:

- **masuk** → `session_start`
- **mulai main** → `stage_start`
- **berhasil** → `stage_clear` (per stage)
- **gagal** → `run_end` dengan `outcome = game_over`
- **berhenti sendiri** → `run_end` dengan `outcome = abandoned`
- **panjang run** → `run_ms`, `cleared`
- **retensi** → `days_since_install`, `days_played`, `returning_d1/7/30` di setiap `session_start`

## 2. Retention tanpa server

Server tidak ada, jadi retensi dihitung **di perangkat**: modul
`src/telemetry/session.ts` menyimpan (di `localStorage`, key
`sga.telemetry.session.v1`) tanggal install, jumlah launch, dan daftar hari unik
(maksimal 90 hari). Angkanya dikirim sebagai properti `session_start`, jadi begitu
kamu memasang sink, retensi D1/D7/D30 langsung terbaca tanpa perubahan di game.

Menghapus data aplikasi akan mengosongkan angka ini — itu memang konsekuensi
wajar dari aplikasi tanpa akun.

## 3. Debug di build development

```bash
npm run dev
# buka: http://localhost:3000/?telemetry=console
```

Semua event tercetak di console. `?telemetry=memory` menyimpannya di memori
(berguna kalau kamu mau membaca `recentEvents()` dari DevTools). Build release
mengabaikan query string ini sepenuhnya (`import.meta.env.DEV`).

## 4. Kalau memasang sink

Contoh (Firebase Analytics):

```ts
// src/main.tsx, sebelum render
import { configureAnalytics } from './telemetry/analytics';
configureAnalytics({
  id: 'firebase',
  track: (event) => void logEvent(analytics, event.name, event.props),
});
```

Urutan yang **wajib** diikuti kalau sink mengirim data keluar perangkat:

1. Pasang SDK + `configureAnalytics` di `src/main.tsx`.
2. Perbarui `src/legal/privacyPolicy.ts` (bagian "Layanan pihak ketiga" dan
   "Data yang tidak kami kumpulkan" **tidak lagi benar**) — naikkan
   `PRIVACY_POLICY_VERSION` dan `PRIVACY_LAST_UPDATED`.
3. Jalankan `npm run docs:privacy` → upload ulang `docs/PRIVACY.md` ke URL publik.
4. Perbarui jawaban **Data safety** di Play Console (`docs/DATA-SAFETY.md`) —
   bukan lagi "No data collected".
5. Kalau sink butuh izin baru (mis. `AD_ID`), perbarui `AndroidManifest.xml` dan
   jawaban "Advertising ID".
6. Baru rilis versi barunya.

Jangan pernah mengaktifkan sink diam-diam tanpa langkah 2–5: itu pelanggaran
kebijakan Play (Data safety yang tidak sesuai) dan membuat dokumen privasi bohong.

## 5. Batasan desain

- `track()` **tidak pernah** melempar error (dibungkus try/catch) — telemetri
  tidak boleh mematikan game.
- Properti dipangkas: string maksimal 160 karakter, maksimal 24 properti,
  `NaN`/`Infinity` dibuang.
- Error yang sama hanya dilaporkan **sekali per launch** (maksimal 20 pesan),
  supaya render loop yang rusak tidak membanjiri sink.
- Tidak ada ID perangkat, ID iklan, atau data pribadi di properti mana pun.
