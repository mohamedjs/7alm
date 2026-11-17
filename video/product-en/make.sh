#!/usr/bin/env bash
# English cut of the 7alm product video, from the same filmed clips as video/product (copy clips/ from there).
#   TTS_PROVIDER=elevenlabs|gemini|openrouter  VOICE=<voice id or name>  bash make.sh
set -euo pipefail
cd "$(dirname "$0")"
python3 tts.py lines.json vo/ --provider "${TTS_PROVIDER:-elevenlabs}" ${VOICE:+--voice "$VOICE"}
python3 transcribe.py lines.json vo/ > vo/transcripts.txt || true    # read it: every take vs its script
python3 build.py storyboard.json vo/
python3 - <<'PY'
import json, os
T = json.load(open('timing.json'))
for s in T['scenes']:
    if s.get('type') == 'shot': s['frames'] = len(os.listdir(f"clips/{s['clip']}"))
json.dump(T, open('timing.json', 'w'), ensure_ascii=False, indent=1)
PY
TOTAL=$(python3 -c 'import json;print(json.load(open("timing.json"))["total"])')
python3 hf_wrap.py --page stage.html --out hf --size 1920x1080 --duration "$TOTAL" --audio audio/mix.wav \
  --data timing.json=TIMING --fn render --copy fonts img clips remixicon.css remixicon.woff2 --render 7alm-product-en.mp4
ffmpeg -y -loglevel error -i 7alm-product-en.mp4 -vf scale=1280:-2 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -movflags +faststart ../../site/assets/7alm-product-en.mp4
ffmpeg -y -loglevel error -ss 21 -i 7alm-product-en.mp4 -frames:v 1 -vf scale=1280:-2 -q:v 4 ../../site/assets/7alm-product-en-poster.jpg
ffprobe -v error -show_entries format=duration -of csv=p=0 7alm-product-en.mp4
