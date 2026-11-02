#!/usr/bin/env bash
# Generate the Android launcher icons and the splash logo from one 1024x1024
# source image.
#
#   tools/make-android-assets.sh assets/app-icon.png android/app/src/main/res
#
# What it writes:
#   mipmap-<density>/ic_launcher.png             legacy square (pre-Android 8)
#   mipmap-<density>/ic_launcher_round.png       legacy round  (pre-Android 8)
#   mipmap-<density>/ic_launcher_foreground.png  adaptive foreground (108dp)
#   drawable-nodpi/splash_logo.png               splash artwork (brand background)
#
# The adaptive foreground is the emblem *inside the safe zone*: the launcher may
# mask an adaptive icon to a circle of 66dp inside its 108dp canvas, so anything
# drawn outside that circle can be cut off. The source art's background is the
# same navy as the adaptive background layer, so scaling the artwork down and
# letting its own background bleed to the edge keeps the seam invisible.
set -euo pipefail

SRC="${1:?source png required}"
RES="${2:?res dir required}"
BG="#0D1627" # sampled from the source's corner; also the adaptive background

echo "==> Launcher icons"
# density:legacy_size:adaptive_canvas
while IFS=: read -r density legacy canvas; do
  [ -z "$density" ] && continue
  dir="$RES/mipmap-$density"
  mkdir -p "$dir"

  # Legacy square icon: full artwork with rounded corners.
  convert "$SRC" -resize "${legacy}x${legacy}" \
    \( -size "${legacy}x${legacy}" xc:none -draw "roundrectangle 0,0,$((legacy-1)),$((legacy-1)),$((legacy/5)),$((legacy/5))" \) \
    -alpha set -compose DstIn -composite \
    -strip -colors 256 -define png:compression-level=9 "$dir/ic_launcher.png"

  # Legacy round icon.
  convert "$SRC" -resize "${legacy}x${legacy}" \
    \( -size "${legacy}x${legacy}" xc:none -draw "circle $((legacy/2)),$((legacy/2)) $((legacy/2)),0" \) \
    -alpha set -compose DstIn -composite \
    -strip -colors 256 -define png:compression-level=9 "$dir/ic_launcher_round.png"

  # Adaptive foreground: 108dp canvas, artwork at 74% so the emblem (~68% of the
  # artwork) lands inside the 66dp safe circle.
  art=$(( canvas * 74 / 100 ))
  convert -size "${canvas}x${canvas}" "xc:${BG}" \
    \( "$SRC" -resize "${art}x${art}" \) -gravity center -composite \
    -strip -colors 256 -define png:compression-level=9 "$dir/ic_launcher_foreground.png"

  echo "    mipmap-$density  legacy=${legacy}px  foreground=${canvas}px (art ${art}px)"
done <<'EOF'
mdpi:48:108
hdpi:72:162
xhdpi:96:216
xxhdpi:144:324
xxxhdpi:192:432
EOF

echo "==> Splash logo"
# The Android 12+ splash shows a single square icon on the splash background.
# Keeping the artwork's own navy background (identical to the splash colour)
# means the square never shows as a box.
mkdir -p "$RES/drawable-nodpi"
convert "$SRC" -resize 512x512 -strip -colors 256 -define png:compression-level=9 "$RES/drawable-nodpi/splash_logo.png"
echo "    drawable-nodpi/splash_logo.png  512x512"

echo "==> Done"
