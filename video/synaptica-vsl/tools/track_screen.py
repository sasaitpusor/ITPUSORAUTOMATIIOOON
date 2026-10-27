# Track the monitor's title-bar band and bottom bar in lateral shots → per-frame patch geometry + colours.
import sys, json, cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]
FPS = 30
INTERVALS = [(76.0, 85.733), (95.067, 96.68), (112.666, 122.333)]
cap = cv2.VideoCapture(src)
res = []
def runs(v, thr_dark=70, thr_bright=150):
    return v < thr_dark, v > thr_bright
for a, b in INTERVALS:
    f0, f1 = round(a * FPS), round(b * FPS)
    cap.set(cv2.CAP_PROP_POS_FRAMES, f0)
    frames = []
    for fi in range(f0, f1):
        ok, fr = cap.read()
        if not ok: break
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        g = cv2.GaussianBlur(g, (5, 5), 0)
        # top: scan columns, find bright(wall) → dark(bezel+title) run ≥ 25 px → bright (content)
        pts = []
        for x in range(1000, 1890, 15):
            col = g[40:520, x]
            dark = col < 75; y = 0; found = None
            while y < len(col):
                if dark[y]:
                    y2 = y
                    while y2 < len(col) and dark[y2]: y2 += 1
                    if y2 - y >= 25 and y2 < len(col) - 8 and col[y2:y2 + 8].mean() > 150:
                        found = (y + 40, y2 + 40); break
                    y = y2
                y += 1
            if found: pts.append((x, found[0], found[1]))
        top = None
        if len(pts) >= 8:
            P = np.array(pts, np.float32)
            A = np.vstack([P[:, 0], np.ones(len(P))]).T
            m, c = np.linalg.lstsq(A, P[:, 2], rcond=None)[0]
            r = np.abs(P[:, 2] - (m * P[:, 0] + c)); keep = r < max(6, np.median(r) * 3)
            m, c = np.linalg.lstsq(A[keep], P[keep, 2], rcond=None)[0]
            m2, c2 = np.linalg.lstsq(A[keep], P[keep, 1], rcond=None)[0]
            xs = P[keep, 0]
            top = dict(m=float(m), c=float(c), m_dark=float(m2), c_dark=float(c2), x0=float(xs.min()) - 60, x1=float(min(1920, xs.max() + 60)))
        # bottom: scan columns upward from y 1000: find content(bright) → dark band (bottom bar) transition
        bp = []
        for x in range(1300, 1900, 15):
            col = g[380:1060, x]
            dark = col < 75
            idx = None
            for y in range(10, len(col) - 25):
                if col[y - 10:y].mean() > 160 and dark[y:y + 20].all():
                    idx = y + 380; break
            if idx: bp.append((x, idx))
        bot = None
        if len(bp) >= 6:
            Q = np.array(bp, np.float32)
            A = np.vstack([Q[:, 0], np.ones(len(Q))]).T
            m, c = np.linalg.lstsq(A, Q[:, 1], rcond=None)[0]
            r = np.abs(Q[:, 1] - (m * Q[:, 0] + c)); keep = r < max(6, np.median(r) * 3)
            m, c = np.linalg.lstsq(A[keep], Q[keep, 1], rcond=None)[0]
            bot = dict(m=float(m), c=float(c), xr=float(min(1920, Q[keep, 0].max() + 20)))
        # colours: title bar (dark), url/content band (light)
        col_dark = col_light = None
        if top:
            xm = int((top['x0'] + top['x1']) / 2)
            yb = int(top['m'] * xm + top['c'])
            col_dark = [int(v) for v in np.median(fr[max(0, yb - 22):yb - 6, int(top['x0']) + 40:int(top['x1']) - 40].reshape(-1, 3), axis=0)[::-1]]
            col_light = [int(v) for v in np.median(fr[yb + 6:yb + 40, int(top['x0']) + 40:int(top['x1']) - 40].reshape(-1, 3), axis=0)[::-1]]
        frames.append(dict(f=fi, top=top, bot=bot, dark=col_dark, light=col_light))
    ok_top = sum(1 for x in frames if x['top']); ok_bot = sum(1 for x in frames if x['bot'])
    print(f'interval {a}-{b}: frames {len(frames)} top {ok_top} bot {ok_bot}')
    res.append(dict(start=a, end=b, frames=frames))
json.dump(res, open(out, 'w'))
