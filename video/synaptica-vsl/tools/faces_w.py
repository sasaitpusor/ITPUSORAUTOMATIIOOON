import sys, json, cv2
src, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src)
fc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
fps = cap.get(cv2.CAP_PROP_FPS); i = 0; res = []
while True:
    ok, fr = cap.read()
    if not ok: break
    if i % 15 == 0:
        h, w = fr.shape[:2]; k = float(sys.argv[3]) / w if len(sys.argv) > 3 else 1080 / w
        g = cv2.cvtColor(cv2.resize(fr, (w//2, h//2)), cv2.COLOR_BGR2GRAY)
        fs = fc.detectMultiScale(g, 1.1, 6, minSize=(60,60))
        boxes = [[int(x*2*k), int(y*2*k), int(bw*2*k), int(bh*2*k)] for x,y,bw,bh in fs]
        res.append(dict(t=round(i/fps,2), w=w, h=h, faces=boxes))
    i += 1
json.dump(res, open(out,"w"))
big = [max(r["faces"], key=lambda b: b[2]*b[3]) for r in res if r["faces"]]
print("frames", len(res), "with faces", len(big))
if big:
    print("x", min(b[0] for b in big), max(b[0]+b[2] for b in big), "y", min(b[1] for b in big), max(b[1]+b[3] for b in big))
for r in res:
    if r["faces"]:
        b = max(r["faces"], key=lambda b: b[2]*b[3]); print(r["t"], b, len(r["faces"]))
    else: print(r["t"], "-")
