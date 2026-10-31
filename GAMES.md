# Dua game di repo ini — nama resmi

Repo ini berisi **dua game** yang tampil berdampingan di satu stage (`.game-pair`).
Mulai sekarang keduanya punya nama pendek yang dipakai di kode, test, dan obrolan,
supaya tidak pernah lagi tertukar antara "game 1 / game 2", "kiri / kanan", atau "SGA".

| Nama | Pane | Posisi | Kode | Pemilik tampilan |
| --- | --- | --- | --- | --- |
| **Game A — GUNHIT** | `data-game-pane="sga"` `data-game-id="A"` | kiri (index 0) | `src/games/gunhit/**` | Game milik kita: gameplay canvas 420×760, menu `PERFECT SHOT` + semua halaman SGA (arsenal, quest, rank, setting, level map). |
| **Game B — PERFECT SHOT** | `data-game-pane="perfect-shot"` `data-game-id="B"` | kanan (index 1) | `src/games/perfect-shot/**` | Game referensi: dipakai apa adanya sebagai sumber animasi/art yang kita tiru. |

Urutan di stage: **A dulu, baru B** (`src/App.tsx` → `src/games.json`/`.game-pair`).

## Aturan penyebutan

- "**Game A**" / "**GUNHIT**" = game kiri. Kalau perlu lebih spesifik: "menu Game A", "level 1 Game A", "roda Game A".
- "**Game B**" / "**PERFECT SHOT**" = game kanan (referensi). Kalau perlu: "roda level 1 Game B", "animasi masuk Game B".
- Jangan pakai "game 1 / game 2" lagi. Angka 1 dan 2 ambigu karena B adalah game referensi, bukan urutan rilis.
- Kalau menyebut sebuah *elemen* (roda, senjata, transisi), sebut dulu game-nya: "roda Game B di level 1 Game A".

## Label yang terlihat di aplikasi

Top nav sekarang menampilkan tombol:

- `A · GUNHIT SGA`
- `B · PERFECT SHOT`

Dan tiap pane membawa `data-game-id` (`A`/`B`) + `data-game-name` sehingga otomasi
(screenshot, test, console) bisa memilih game tanpa menebak posisi.

## Sumber referensi Game B

Versi acuan Game B ada di repo ini (`src/games/perfect-shot/**`) dan di tiga zip
referensi (`main-menu-transition-animations.zip`, `2d-game-intro-animation.zip`,
`2d-game-intro-animation (1).zip`). Semua penyelarasan visual Game A mengacu ke sini.
