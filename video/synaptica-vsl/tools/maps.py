# Locate the 9x5 grid of topographic circles, rectify perspective, clean UI, export assets.
import sys, json, cv2, numpy as np
src, outdir, name = sys.argv[1], sys.argv[2], sys.argv[3]
img = cv2.imread(src)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
mask = ((hsv[..., 1] > 90) & (hsv[..., 2] > 70)).astype(np.uint8) * 255
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
n, lab, stats, cent = cv2.connectedComponentsWithStats(mask)
H, W = mask.shape
blobs = [(cent[i], stats[i]) for i in range(1, n) if stats[i][4] > (W * H) / 2500 and 0.6 < stats[i][2] / max(1, stats[i][3]) < 1.6]
areas = np.array([s[4] for c, s in blobs]); med = np.median(areas)
blobs = [(c, s) for c, s in blobs if 0.45 * med < s[4] < 1.8 * med]
pts = np.array([c for c, s in blobs], np.float32)
print(name, 'circles found', len(pts))
if len(pts) != 45:
    # tabs/tiny UI blobs: keep the 45 closest to the median size
    order = np.argsort(np.abs(np.array([s[4] for c, s in blobs]) - med))[:45]
    pts = pts[order]; blobs = [blobs[i] for i in order]
# rows by y (k-means 1D), columns by x within row
ys = np.sort(pts[:, 1]); rows = np.array_split(np.argsort(pts[:, 1]), 5)
grid = []
for r in rows:
    rr = pts[r]; grid.append(rr[np.argsort(rr[:, 0])])
grid = np.array(grid)  # 5 x 9 x 2
rad = float(np.median([np.sqrt(s[4] / np.pi) for c, s in blobs]))
# homography: circle centres -> ideal regular grid
pitch_x = float(np.median(np.diff(grid[:, :, 0], axis=1))); pitch_y = float(np.median(np.diff(grid[:, :, 1], axis=0)))
P = max(pitch_x, pitch_y)
ideal = np.array([[[x * P, y * P * (pitch_y / pitch_x)] for x in range(9)] for y in range(5)], np.float32)
Hm, _ = cv2.findHomography(grid.reshape(-1, 2), ideal.reshape(-1, 2))
mx, my = int(P * 0.62), int(P * 0.62)
T = np.array([[1, 0, mx], [0, 1, my], [0, 0, 1]], np.float64) @ Hm
outW, outH = int(8 * P + 2 * mx), int(4 * P * (pitch_y / pitch_x) + my + int(P * 0.85))
warped = cv2.warpPerspective(img, T, (outW, outH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
# clean: "Activate Windows" watermark (low-sat grey text) in bottom-right → inpaint everything that is not circle / label
whsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
circ = np.zeros(warped.shape[:2], np.uint8)
centres = cv2.perspectiveTransform(grid.reshape(-1, 1, 2), T).reshape(5, 9, 2)
for row in centres:
    for (x, y) in row: cv2.circle(circ, (int(x), int(y)), int(rad * P / pitch_x * 1.08), 255, -1)
label_band = np.zeros_like(circ)
for row in centres:
    for (x, y) in row: cv2.rectangle(label_band, (int(x - P * 0.28), int(y + rad * 1.05)), (int(x + P * 0.28), int(y + rad * 1.55)), 255, -1)
paper0 = (circ == 0) & (label_band == 0)
ref = np.median(warped[paper0].reshape(-1, 3), axis=0)
gain = np.clip(247.0 / np.maximum(ref, 1), 1.0, 1.6)
warped = np.clip(warped.astype(np.float32) * gain, 0, 255).astype(np.uint8)
whsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
bg = cv2.medianBlur(warped, 31)
wm = ((whsv[..., 1] < 60) & (whsv[..., 2] < 225) & (circ == 0) & (label_band == 0)).astype(np.uint8) * 255
wm = cv2.dilate(wm, np.ones((5, 5), np.uint8))
clean = warped.copy(); clean[wm > 0] = (247, 247, 247)
# flatten paper background to a neutral near-white outside circles and labels
paper = (circ == 0) & (label_band == 0)
clean[paper] = (247, 247, 247)
lab_bg = (label_band > 0) & (circ == 0) & (whsv[..., 1] < 70) & (whsv[..., 2] > 150)
clean[lab_bg] = (247, 247, 247)
cv2.imwrite(f'{outdir}/{name}.png', clean)
json.dump(dict(width=outW, height=outH, pitch=P, radius=rad * P / pitch_x, centres=centres.round(1).tolist()), open(f'{outdir}/{name}.json', 'w'))
print(name, 'out', outW, outH, 'pitch', round(P, 1), 'r', round(rad * P / pitch_x, 1))
