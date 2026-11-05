#!/usr/bin/env python3
"""Package the portable game, never node_modules, QA images, or any v1 file."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import sys

ROOT = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "perfect-shot-v2.zip"
FILES = [
    ".gitignore", "README.md", "index.html", "package.json", "package-lock.json",
    "tsconfig.json", "vite.config.ts", "proof.ts", "smoke.ts", "package.py",
    "dist/index.html",
]


def main() -> None:
    files = [ROOT / name for name in FILES]
    files.extend(sorted((ROOT / "src").rglob("*.ts")))
    missing = [str(p.relative_to(ROOT)) for p in files if not p.is_file()]
    if missing:
        raise SystemExit("Build the game first. Missing: " + ", ".join(missing))
    if OUTPUT in files:
        raise SystemExit("The output must not overwrite an input file.")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(files):
            name = "v2-perfect-shot/" + file.relative_to(ROOT).as_posix()
            # Stable metadata makes identical source/build produce identical ZIPs.
            info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, file.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    print(f"{OUTPUT} — {len(files)} files, {OUTPUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
