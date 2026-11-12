#!/usr/bin/env bash
# Stitches video/frames/*.png into the launch video with a slow push-in on
# every slide and crossfades between them. Output: site/assets/7alm-demo.mp4
set -euo pipefail
cd "$(dirname "$0")/.."

FRAMES=(video/frames/*.png)
DUR=4.2      # seconds each slide is on screen
FADE=0.6     # crossfade length
FPS=30
OUT=site/assets/7alm-demo.mp4

inputs=()
filters=""
for i in "${!FRAMES[@]}"; do
  inputs+=(-i "${FRAMES[$i]}")
  # Ken Burns push-in: scale up, then zoom from 1.0 to ~1.06 over the slide.
  filters+="[$i:v]scale=2304:1296,zoompan=z='min(zoom+0.0005,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$(awk "BEGIN{print int($DUR*$FPS)}"):s=1920x1080:fps=$FPS,format=yuv420p,setsar=1[v$i];"
done

prev="v0"
offset=0
for ((i = 1; i < ${#FRAMES[@]}; i++)); do
  offset=$(awk "BEGIN{print $offset + $DUR - $FADE}")
  filters+="[$prev][v$i]xfade=transition=fade:duration=$FADE:offset=$offset[x$i];"
  prev="x$i"
done
filters+="[$prev]fade=t=out:st=$(awk "BEGIN{print $offset + $DUR - 0.8}"):d=0.8[out]"

ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$filters" -map "[out]" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -r "$FPS" "$OUT"

# Poster frame for the site.
ffmpeg -y -loglevel error -i "${FRAMES[0]}" -vf scale=1280:-1 site/assets/7alm-poster.jpg
echo "wrote $OUT ($(du -h "$OUT" | cut -f1)), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s"
