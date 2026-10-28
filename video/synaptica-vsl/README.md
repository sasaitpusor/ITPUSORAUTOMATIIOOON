# Synaptica Cluj — VSL „Ce se întâmplă la o hartă a creierului” (Remotion 4, 16:9)

VSL pentru landing page, 1920×1080, 30 fps, 3:49,7 (3:45,2 vorbire + 4,5 s card final).
Animațiile explicative stau peste Rebeca, iar unele scene acoperă tot ecranul. Totul respectă
*Manualul de brand v1* și deciziile clientului din proiect.

**Nu sunt în repo:** clipurile (`public/vsl.mp4`, `public/broll_*.mp4`), hărțile EEG reale
(`public/maps/`, date de sănătate ale clienților, folosite cu acord), sunetul și randările.

## Structură

| Fișier | Conține |
|---|---|
| `src/brand.ts` | tokenurile de brand (culori, fonturi, scară tipografică, raze, grilă 16:9, mișcare) |
| `src/lib.ts` | timpi în secunde de ieșire (`useT`), easing, ferestre de vizibilitate, intrări |
| `src/core/core.tsx` | video + CameraTrack (zoom alternativ pe jump-cut-uri), pastilele de capitol 02–07, subtitrări sincronizate pe cuvânt, petice peste UI-ul monitorului |
| `src/ui/kit.tsx` | carduri, etichete, titluri, note de conformitate, „Reprezentare ilustrativă”, scene full-screen, linii care se desenează, buton CTA |
| `src/ui/maps.tsx` | hărți EEG reale: geometrie pe grilă 5×9, ferestre, Ken Burns, adnotări (paranteze, contururi, inele), eșantioane de cerc |
| `src/ui/media.tsx` | unde stilizate (ilustrative), cele 5 benzi, cadrele B-roll verticale ale clientului |
| `src/chapters/ch00–ch07` | câte un capitol: hook, cum se citește, 5 exemple (02a/02b), cele 5 unde, nu e lipsă de voință, două variante (05/05b), pas cu pas, primul pas + card final |
| `src/data/*.json` | EDL-ul tăieturii, subtitrări (cuvinte cu timpi), planul pe beat-uri, camera, cadrele, metadatele hărților |
| `tools/` | transcriere Whisper, detecția feței, detecția tăieturilor, rectificarea hărților, petice urmărite peste UI-ul monitorului |

## Pași

```bash
npm ci
# public/: vsl.mp4 (tăietura SDR, 1920×1080, 6756 cadre), broll_{cabluri,harta,neurofeedback}.mp4, maps/*.png
node render.mjs sheet verificare 12 47 90 180      # planșă de cadre → out/verificare.jpg
node render.mjs full                               # out/overlay.mp4 (fără sunet)
ffmpeg -i out/overlay.mp4 -i vsl_audio_final.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4
```

Pentru randări repetate, setează `BUNDLE_DIR` la un singur folder: altfel fiecare bundle copiază `public/` într-un folder temporar nou.

## Licență

Remotion e gratuit pentru persoane fizice și firme de până la 3 angajați; peste, necesită licență.
