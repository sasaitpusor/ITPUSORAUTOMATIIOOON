# Synaptica Cluj — motion graphics (Remotion 4)

Overlay-ul animat pentru clipurile Synaptica: hook animat, etichete de capitol, carduri explicative,
scene B-roll animate pe tot ecranul, subtitrări sincronizate și cardul final cu CTA-ul unic.
Totul respectă *Manualul de brand v1 (oct. 2026)*.

Tokenurile de brand (culori, fonturi, raze, margini, zone sigure, timpi) sunt într-un singur obiect,
`B`, la începutul lui `src/index.tsx`.

**Nu sunt în repo:** clipurile video (`public/*.mp4`), randările (`out/`) și `node_modules/`.

## Compoziția actuală

`Synaptica`: Ad 1 Rebeca, 1080×1920, 30 fps, 884 de cadre. Timpii din cod sunt cei ai acestui clip.

| Componentă | Ce face |
|---|---|
| `Footage` | clipul, cu push-in pe hook, zoom-punch pe „Însă”, revenire la capitolul 01 |
| `Hook` | card bleumarin: text în fante, cheie fixă, ✕ „să repari” → ✓ „să înțelegi”, unde EEG → rețea neurală, se morfează în pastila de capitol |
| `Chapter` | pastila cu simbolul logo + „01 · Harta creierului” etc. |
| `Insert` + `SceneMap` | B-roll animat: senzorii 10–20 se aprind, semnalul curge, harta se printează pe hârtie |
| `BrainMapCard`, `CauseCard` | carduri crem în zona pieptului |
| `Insert` + `SceneSteps` | B-roll animat: „O evaluare simplă.” în 3 pași + „Fără nicio obligație” |
| `EndCard` | logo complet + buton terracotta „Programează-ți scanarea creierului” |
| `Subtitles` | Inter Semibold, alb pe bleumarin 72%, cuvinte nerostite estompate, 4 cuvinte accentuate |

`src/words.ts` conține frazele subtitrării, cu timpi pe cuvânt, generate din transcrierea Whisper.

## Pași

```bash
npm ci

# 1. clipul sursă → H.264 1080×1920 în public/
ffmpeg -i clip.mov -an -vf "scale=1080:1920:flags=lanczos,format=yuv420p" \
  -c:v libx264 -crf 12 -g 15 -r 30 public/clip.mp4

# 2. transcriere (faster-whisper large-v3) și poziția feței (OpenCV Haar)
pip install faster-whisper "opencv-python-headless<5"
python3 -I tools/transcribe.py clip.mov transcript.json
python3 -I tools/faces.py clip.mov faces.json

# 3. cadre-cheie pentru verificare (SCALE=1 pentru rezoluție completă)
node render.mjs stills 15 60 105 205
# 4. randarea finală → out/overlay.mp4 (fără sunet)
node render.mjs full
```

Pentru Chromium altul decât cel din mediul cloud: `CHROME_PATH=/cale/spre/chrome node render.mjs ...`

### 5. Sunetul (loudnorm în două treceri, țintă −14 LUFS)

```bash
PRE="highpass=f=80,acompressor=threshold=-22dB:ratio=3:attack=10:release=200"
# trecerea 1: măsoară
ffmpeg -i clip.mov -vn -af "$PRE,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null -
# trecerea 2: aplică valorile măsurate (input_i, input_tp, input_lra, input_thresh, target_offset)
ffmpeg -i out/overlay.mp4 -i clip.mov -map 0:v -map 1:a -c:v copy \
  -af "$PRE,loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true,aresample=48000" \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart final.mp4
# verificare
ffmpeg -i final.mp4 -map 0:a -af ebur128=peak=true -f null -
```

## Licență

Remotion e gratuit pentru persoane fizice și firme de până la 3 angajați; peste, necesită licență.
