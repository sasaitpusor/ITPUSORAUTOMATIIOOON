import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
raw = subprocess.run(["ffmpeg","-v","error","-i",src,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True,check=True).stdout
audio = np.frombuffer(raw, np.float32)
model = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, info = model.transcribe(audio, language="ro", word_timestamps=True, vad_filter=True, beam_size=5)
res = []
for s in segs:
    words = [dict(w=w.word, s=round(w.start,2), e=round(w.end,2), p=round(w.probability,3)) for w in s.words]
    res.append(dict(start=round(s.start,2), end=round(s.end,2), text=s.text.strip(), words=words))
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text.strip()}", flush=True)
json.dump(res, open(out,"w"), ensure_ascii=False, indent=1)
for s in res:
    for w in s["words"]:
        if w["p"] < 0.6: print(f"  NESIGUR {w['s']:6.2f} '{w['w'].strip()}' p={w['p']}")
