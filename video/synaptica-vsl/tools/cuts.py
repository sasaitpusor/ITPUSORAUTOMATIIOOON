# Detect edit points / jump cuts: per-frame mean abs diff on downscaled gray frames, flag spikes.
import sys, json, cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS)
prev = None; diffs = []
while True:
    ok, fr = cap.read()
    if not ok: break
    g = cv2.cvtColor(cv2.resize(fr, (96, int(96 * fr.shape[0] / fr.shape[1]))), cv2.COLOR_BGR2GRAY).astype(np.float32)
    diffs.append(0.0 if prev is None else float(np.mean(np.abs(g - prev))))
    prev = g
d = np.array(diffs); med = float(np.median(d[1:])); mad = float(np.median(np.abs(d[1:] - med))) + 1e-6
cuts = []
for i in range(1, len(d)):
    local = np.median(d[max(1, i - 15):i + 15])
    if d[i] > max(4 * local, med + 12 * mad, 3.0):
        cuts.append(dict(frame=i, t=round(i / fps, 3), diff=round(d[i], 2), local=round(float(local), 2)))
json.dump(dict(fps=fps, frames=len(d), median=med, cuts=cuts), open(out, "w"), indent=1)
print(f"fps {fps:.3f} frames {len(d)} median {med:.2f} cuts {len(cuts)}")
for c in cuts: print(f"  {c['t']:8.2f}s  f{c['frame']:6d}  diff {c['diff']:6.2f} (local {c['local']})")
