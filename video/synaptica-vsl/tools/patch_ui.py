# Feathered blur on the monitor UI (title bar + "Activate Windows") in lateral shots, tracked by template matching.
import sys, subprocess, cv2, numpy as np
src, dst = sys.argv[1], sys.argv[2]
FPS = 30
IV = [  # (out_start, out_end, title polygon, title template rect, AW polygon, AW template rect)  — frame coords at interval start
  (76.0, 85.733, [(980,206),(1920,153),(1920,223),(980,276)], (1250,150,1650,262), [(1745,726),(1920,720),(1920,778),(1745,784)], (1600,690,1905,800)),
  (95.067, 96.68, [(940,191),(1920,155),(1920,210),(940,246)], (1250,150,1650,250), [(1690,736),(1920,728),(1920,826),(1690,834)], None),
  (112.666, 122.333, [(930,157),(1920,127),(1920,175),(930,205)], (1250,120,1650,215), [(1755,696),(1920,692),(1920,747),(1755,751)], (1600,670,1905,770)),
]
cap = cv2.VideoCapture(src)
W, H = int(cap.get(3)), int(cap.get(4)); N = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
enc = subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
    '-c:v','libx264','-preset','medium','-crf','14','-g','15','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',dst], stdin=subprocess.PIPE)
ranges = [(round(a*FPS), round(b*FPS), a) for a, b, *_ in IV]
state = {}
def track(gray, tpl, rect, prev):
    x0, y0, x1, y1 = rect; px, py = prev; m = 160
    sx0, sy0 = max(0, x0 + px - m), max(0, y0 + py - m); sx1, sy1 = min(W, x1 + px + m), min(H, y1 + py + m)
    r = cv2.matchTemplate(gray[sy0:sy1, sx0:sx1], tpl, cv2.TM_CCOEFF_NORMED)
    _, mv, _, ml = cv2.minMaxLoc(r)
    return (sx0 + ml[0] - x0, sy0 + ml[1] - y0, mv)
log = []
for fi in range(N):
    ok, fr = cap.read()
    if not ok: break
    hit = next((k for k, (a, b, _) in enumerate(ranges) if a <= fi < b), None)
    if hit is not None:
        a, b, _ = ranges[hit]; _, _, tp, tr, ap, ar = IV[hit]
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        if fi == a:
            state = dict(t1=g[tr[1]:tr[3], tr[0]:tr[2]].copy(), t2=None if ar is None else g[ar[1]:ar[3], ar[0]:ar[2]].copy(), d1=(0, 0), d2=(0, 0))
        else:
            x, y, v = track(g, state['t1'], tr, state['d1']); state['d1'] = (x, y) if v > 0.45 else state['d1']
            if ar is None: state['d2'] = state['d1']; v2 = 1.0
            else:
                x2, y2, v2 = track(g, state['t2'], ar, state['d2']); state['d2'] = (x2, y2) if v2 > 0.45 else state['d2']
            if fi % 30 == 0: log.append((fi, state['d1'], round(v, 2), state['d2'], round(v2, 2)))
        mask = np.zeros((H, W), np.float32)
        for poly, d in ((tp, state['d1']), (ap, state['d2'])):
            pts = np.array([(px + d[0], py + d[1]) for px, py in poly], np.int32)
            cv2.fillPoly(mask, [pts], 1.0)
        mask = cv2.GaussianBlur(mask, (0, 0), 7)[..., None]
        blur = cv2.GaussianBlur(fr, (0, 0), 16)
        fr = (fr * (1 - mask) + blur * mask).astype(np.uint8)
    enc.stdin.write(fr.tobytes())
enc.stdin.close(); enc.wait()
for l in log: print(l)
