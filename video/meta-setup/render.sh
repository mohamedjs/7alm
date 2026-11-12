#!/usr/bin/env bash
# Stitch walkthrough frames into a silent MP4 (no audio track at all).
# Usage: video/meta-setup/render.sh <frames dir> <out.mp4>
set -euo pipefail
FR="$1"; OUT="$2"; FPS=30; FADE=0.5
STEPS="$(dirname "$0")/steps.json"
mapfile -t DURS < <(python3 -c "import json;[print(8 if s.get('kind')=='note' else 4.5 if s.get('kind')=='title' else 6) for s in json.load(open('$STEPS'))]")
inputs=(); filters=""; i=0
for f in "$FR"/*.png; do
  d=${DURS[$i]}; inputs+=(-i "$f")
  filters+="[$i:v]scale=1920:1080,zoompan=z='min(zoom+0.0003,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$(python3 -c "print(int($d*$FPS))"):s=1920x1080:fps=$FPS,format=yuv420p,setsar=1[v$i];"
  i=$((i+1))
done
prev="v0"; off=0
for ((k=1;k<i;k++)); do
  off=$(python3 -c "print(round($off+${DURS[$((k-1))]}-$FADE,3))")
  filters+="[$prev][v$k]xfade=transition=fade:duration=$FADE:offset=$off[x$k];"; prev="x$k"
done
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "${filters%;}" -map "[$prev]" -an -c:v libx264 -preset medium -crf 20 -movflags +faststart "$OUT"
