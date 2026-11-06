#!/usr/bin/env python3
"""Reproducible, physically pruned Perfect Shot Lite source + offline build."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import sys

ROOT = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "perfect-shot-v2.zip"
FILES = [
    ".gitignore", "README.md", "SOURCE-MAP.json", "index.html", "package.json",
    "package-lock.json", "tsconfig.json", "vite.config.ts", "proof.ts", "smoke.tsx",
    "package.py", "dist/index.html", "scripts/styles.mjs", "scripts/raw-loader.mjs",
    "styles/original.css", "styles/lite.css",
]
ASSETS = {
    "orange.svg", "player.svg", "water-caustic.png", "water-waves.png",
    "russo-one-latin-400-normal.woff2", "inter-latin-400-normal.woff2",
    "LICENSE-russo-one.txt", "LICENSE-inter.txt",
}
EXTENSIONS = {".ts", ".tsx", ".css", ".svg", ".png", ".woff2", ".txt"}


def main() -> None:
    files = [ROOT / name for name in FILES]
    source = sorted(p for p in (ROOT / "src").rglob("*") if p.is_file())
    unexpected = [str(p.relative_to(ROOT)) for p in source if p.suffix not in EXTENSIONS or p.is_symlink()]
    actual_assets = {p.name for p in (ROOT / "src/assets").iterdir() if p.is_file()}
    if unexpected or actual_assets != ASSETS:
        raise SystemExit("Unexpected/non-Lite assets: " + str(unexpected) + "; " + str(actual_assets ^ ASSETS))
    files.extend(source)
    missing = [str(p.relative_to(ROOT)) for p in files if not p.is_file()]
    if missing:
        raise SystemExit("Run npm run build first. Missing: " + ", ".join(missing))
    if OUTPUT in files:
        raise SystemExit("The output must not overwrite an input file.")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(files):
            name = "v2-perfect-shot/" + file.relative_to(ROOT).as_posix()
            info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, file.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    print(f"{OUTPUT} — {len(files)} files, {OUTPUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
