#!/usr/bin/env bash
# Create the Android release signing key (macOS / Linux).
#
#   bash tools/make-keystore.sh
#
# Membuat:
#   android/game-arcade-hub-release.keystore
#   android/keystore.properties
#
# Keduanya TIDAK di-commit (lihat .gitignore). Backup dua file itu: tanpa file
# yang sama, Play Console menolak update aplikasi yang sudah terpasang.
# Windows: BUILD-APK.bat melakukan hal yang sama otomatis.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
KS_FILE="$ANDROID_DIR/game-arcade-hub-release.keystore"
KS_PROPS="$ANDROID_DIR/keystore.properties"
ALIAS="${KEYSTORE_ALIAS:-gamearcadehub}"

if [ -f "$KS_PROPS" ]; then
  echo "keystore.properties sudah ada - tidak ada yang dibuat."
  exit 0
fi

KEYTOOL=""
if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/keytool" ]; then
  KEYTOOL="$JAVA_HOME/bin/keytool"
elif command -v keytool >/dev/null 2>&1; then
  KEYTOOL="$(command -v keytool)"
fi
if [ -z "$KEYTOOL" ]; then
  echo "[GAGAL] keytool tidak ditemukan. Install JDK 21 (Android Studio membawanya)." >&2
  exit 1
fi

PASS="${KEYSTORE_PASSWORD:-$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20)}"

"$KEYTOOL" -genkeypair \
  -keystore "$KS_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Game Arcade Hub, OU=Mobile, O=Game Arcade Hub, L=Yogyakarta, S=Yogyakarta, C=ID"

cat > "$KS_PROPS" <<PROPS
storeFile=game-arcade-hub-release.keystore
storePassword=$PASS
keyAlias=$ALIAS
keyPassword=$PASS
PROPS

echo
echo "Keystore dibuat:"
echo "  $KS_FILE"
echo "  $KS_PROPS"
echo
echo "SIMPAN/BACKUP dua file di atas. Kalau hilang, aplikasi tidak bisa di-update"
echo "di Play Console dengan akun yang sama."
