// Chapter 02 · part B — examples 3, 4, 5 (OUTPUT 76.0–104.4 s) · beats B20–B27.
// 76.000–78.433 LATERAL 100 %: navy outline TRACKED on the monitor grid (rows 19–45 Hz) + lower-third bottom-left (face is top-left).
// 78.433–85.733 LATERAL 110 % (footage drifts): no monitor annotation; lower-third swaps to "Activitate rapidă crescută".
// 85.733–87.467 FRONTAL: small card "EXEMPLUL 4 DIN 5".
// 87.467–93.150 PRIVACY: opaque cream MapReader on map4_obosit, entering 1 frame BEFORE the laptop insert and leaving 1 frame AFTER it.
// 93.167–95.067 FRONTAL: card "EXEMPLUL 5 DIN 5 · Mult verde" + MiniLegend.
// 95.067–96.680 LATERAL: no graphics.
// 96.680–104.400 MapReader on map5_echilibru (covers the camera move + hidden cut at 101.167).
import React from 'react';
import { Easing } from 'remotion';
import { B, FPS } from '../brand';
import { enter, lin, mix, mixColor, p, useT, win } from '../lib';
import { Card, Draw, GoldBar, Label, Note, Scene, Title } from '../ui/kit';
import { Box, CircleSample, MapImage, MapName, RowBracket, RowOutline, View, fullView, geom } from '../ui/maps';

export const NAVY: Array<[number, number]> = [];       // all full-screen scenes here are cream
export const HIDE_SUBS: Array<[number, number]> = [];

// ─── Timing (exact cut frames, checked on public/vsl.mp4) ────────────────────
const fr = (n: number) => n / FPS;
const T_LAT3 = fr(2280);   // 76.000 cut → LATERAL, example 3 (monitor grid static ±25 px → tracked)
const T_JUMP = fr(2353);   // 78.433 jump cut (camera 110 % from here; grid on the monitor drifts)
const T_FRONT4 = fr(2572); // 85.733 cut → FRONTAL close-up
const T_PRIV0 = fr(2624);  // 87.467 one frame BEFORE the laptop insert (first insert frame = 2625)
const T_PRIV1 = 93.15;     // last insert frame = 2793; scene still covers frame 2794 (93.133), gone at 2795
const T_FRONT5 = fr(2795); // 93.167 first frame after the privacy scene (FRONTAL)
const T_LAT5 = fr(2852);   // 95.067 cut → LATERAL (no graphics)
const T_MAP5 = 96.68;      // "zone" → MapReader 5 (fade, mid-shot)
const T_END = fr(3132);    // 104.400 cut → chapter 03

// word onsets (subs_out.json)
const W3 = { aici: 76.1, mijloc: 76.55, jos: 76.99, rosu: 77.97, creier: 78.59, supra: 78.99 };
const W4 = { aici: 86.23, creier: 87.75, ceata: 88.59, trezesti: 89.71, simti: 91.03, ziua: 92.72 };
const W5 = { echilibrat: 94.3, zone: 96.68, rosii: 96.96, firesc: 98.76, nu: 99.92, vrem: 101.3, echilibru: 103.16 };

const inOut = Easing.inOut(Easing.cubic);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ─── Layout (same MapReader grid as chapter 02a) ─────────────────────────────
const WIN: Box = { x: 704, y: 120, w: 1120, h: 656 };
const PANEL = { x: 96, y: 120, w: 470 };
const AXIS_R = 692;
const AXIS_ARROW_X = 600;
const LEG_PANEL = { x: 96, y: 716 };
const LEG_FRONT = { x: 1224, y: 748 };

const zoomView = (v: View, z: number, ax = 0.5, ay = 0.5): View => {
  const w = (v.x1 - v.x0) / z, h = (v.y1 - v.y0) / z;
  const cx = v.x0 + (v.x1 - v.x0) * ax, cy = v.y0 + (v.y1 - v.y0) * ay;
  return { x0: cx - w * ax, y0: cy - h * ay, x1: cx - w * ax + w, y1: cy - h * ay + h };
};

// Real colour samples (cropped from the real maps — never drawn).
type Hue = 'blue' | 'green' | 'red';
const SAMPLE: Record<Hue, { name: MapName; row: number; col: number }> = {
  blue: { name: 'map2_albastru', row: 1, col: 3 },
  green: { name: 'map1_alerta', row: 2, col: 3 },
  red: { name: 'map2_albastru', row: 0, col: 8 },
};
const RED3 = { name: 'map3_rosu_jos' as MapName, row: 3, col: 5 };     // ex. 3 red (33 Hz)
const GREEN5 = { name: 'map5_echilibru' as MapName, row: 2, col: 6 };  // ex. 5 green (25 Hz)

// ─── Small parts (visual system shared with ch02a) ───────────────────────────
const Dots: React.FC<{ done: number; cur: number; fill?: number }> = ({ done, cur, fill = 0 }) => (
  <svg width={5 * 24} height={20} style={{ display: 'block', flexShrink: 0 }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const cx = 10 + i * 24, cy = 10;
      if (i < done) return <circle key={i} cx={cx} cy={cy} r={7.5} fill={B.c.goldDark} />;
      if (i === cur) return (
        <g key={i}>
          <circle cx={cx} cy={cy} r={6.5} fill="none" stroke={B.c.goldDark} strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={mix(2.6, 7.5, fill)} fill={B.c.goldDark} />
        </g>
      );
      return <circle key={i} cx={cx} cy={cy} r={6.5} fill="none" stroke={B.c.sageLine} strokeWidth={2} />;
    })}
  </svg>
);

const ExampleHead: React.FC<{ n: number; done: number; cur: number; fill?: number; style?: React.CSSProperties }> = ({ n, done, cur, fill, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...style }}>
    <Label>{`Exemplul ${n} din 5`}</Label>
    <Dots done={done} cur={cur} fill={fill} />
  </div>
);

const LEG_SLOTS: Record<Hue, number> = { blue: 18, green: 128, red: 218 };
const LEG_D = 36, LEG_H = 72;
const MiniLegend: React.FC<{ x: number; y: number; k?: number; hi?: Hue; hiK?: number; framed?: boolean }> = ({ x, y, k = 1, hi, hiK = 0, framed }) => {
  if (k <= 0) return null;
  const words: Record<Hue, string> = { blue: 'sub', green: 'în', red: 'peste referință' };
  const op = (h: Hue) => (hi && h !== hi ? 1 - 0.6 * hiK : 1);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 478, height: LEG_H, borderRadius: B.r.card, background: B.c.cream,
      border: framed ? `2px solid ${B.c.sageLine}` : 'none', boxSizing: 'border-box', ...enter(k, 'up', 16) }}>
      {(['blue', 'green', 'red'] as Hue[]).map((h) => {
        const sx = LEG_SLOTS[h] - (framed ? 2 : 0), sy = (LEG_H - LEG_D) / 2 - (framed ? 2 : 0);
        return (
          <React.Fragment key={h}>
            <CircleSample {...SAMPLE[h]} x={sx} y={sy} d={LEG_D} style={{ opacity: op(h) }} />
            <div style={{ position: 'absolute', left: sx + LEG_D + 9, top: 0, height: LEG_H - (framed ? 4 : 0), display: 'flex', alignItems: 'center',
              fontFamily: B.f.sans, fontWeight: 600, fontSize: 24, color: hi === h ? mixColor(hiK, B.c.charcoal, B.c.navy) : B.c.charcoal, opacity: op(h), whiteSpace: 'nowrap' }}>
              {words[h]}
            </div>
            {hi === h && hiK > 0 && (
              <svg width={LEG_D + 16} height={LEG_D + 16} style={{ position: 'absolute', left: sx - 8, top: sy - 8, overflow: 'visible' }}>
                <Draw d={`M${(LEG_D + 16) / 2} 2 a${LEG_D / 2 + 6} ${LEG_D / 2 + 6} 0 1 1 -0.01 0`} k={hiK} color={B.c.navy} width={3} />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Reading row: gold rule grows + text slides in. Head (up to ':') in navy; the tail can arrive later (kTail) on its own word. */
const ReadRow: React.FC<{ k: number; text: string; kTail?: number; after?: React.ReactNode; size?: number }> = ({ k, text, kTail, after, size = 30 }) => {
  if (k <= 0) return null;
  const i = text.indexOf(':');
  const head = i > 0 ? text.slice(0, i + 1) : '';
  const tail = i > 0 ? text.slice(i + 1) : text;
  const kt = clamp01((k - 0.15) / 0.85);
  const k2 = kTail === undefined ? 1 : kTail;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 18 }}>
      <div style={{ width: 4, borderRadius: 2, background: B.c.goldDark, transform: `scaleY(${k})`, transformOrigin: 'top', flexShrink: 0 }} />
      <div style={{ fontFamily: B.f.sans, fontWeight: 600, fontSize: size, lineHeight: 1.25, color: B.c.charcoal, padding: '2px 0', ...enter(kt, 'left', 16) }}>
        {head && <span style={{ color: B.c.navy }}>{head}</span>}
        {head ? ' ' : ''}
        <span style={{ display: 'inline-block', ...enter(k2, 'left', 12) }}>{head ? tail.trim() : tail}</span>
        {after}
      </div>
    </div>
  );
};

const Panel: React.FC<{ k: number; n: number; done: number; cur: number; fill: number; title: string; rows: Array<{ k: number; text: string; kTail?: number }> }> = ({ k, n, done, cur, fill, title, rows }) => (
  <div style={{ position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, ...enter(k, 'left') }}>
    <GoldBar style={{ marginBottom: 18 }} />
    <ExampleHead n={n} done={done} cur={cur} fill={fill} />
    <Title size={44} style={{ marginTop: 18 }}>{title}</Title>
    <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {rows.map((r, i) => <ReadRow key={i} k={r.k} text={r.text} kTail={r.kTail} />)}
    </div>
  </div>
);

const MapWindow: React.FC<{ name: MapName; box: Box; view: View; reveal?: (r: number, c: number) => number }> = ({ name, box, view, reveal }) => (
  <>
    <MapImage name={name} box={box} view={view} radius={B.r.card} bg="#F7F7F7" reveal={reveal} />
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: B.r.card, border: `2px solid ${B.c.sageLine}`, boxSizing: 'border-box' }} />
  </>
);

/** Axis band left of the window: LENTE ↓ RAPIDE + Hz range of every row (follows the Ken Burns). */
const RANGES = ['1–9', '10–18', '19–27', '28–36', '37–45'];
const AxisBand: React.FC<{ name: MapName; box: Box; view: View; k: number; emph?: number; emphRows?: number[]; rapideK?: number }> = ({ name, box, view, k, emph = 0, emphRows = [], rapideK = 0 }) => {
  if (k <= 0) return null;
  const g = geom(name, box, view);
  const vis = (y: number) => clamp01((y - box.y - g.r * 0.35) / 26) * clamp01((box.y + box.h - y - g.r * 0.35) / 26);
  const ys = [0, 1, 2, 3, 4].map((r) => g.pos(r, 0).y);
  const lab = (style: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', right: 1920 - AXIS_R, height: 30, lineHeight: '30px', whiteSpace: 'nowrap', ...style });
  const yTop = ys[0] - g.r * 0.7, yBot = ys[4] + g.r * 0.7;
  const rapY = ys[4] + g.r + 14;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: k }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Draw d={`M${AXIS_ARROW_X} ${yTop} L${AXIS_ARROW_X} ${yBot}`} k={k} width={3} />
        <Draw d={`M${AXIS_ARROW_X - 9} ${yBot - 11} L${AXIS_ARROW_X} ${yBot} L${AXIS_ARROW_X + 9} ${yBot - 11}`} k={p(k, 0.6, 1)} width={3} />
      </svg>
      <div style={lab({ top: ys[0] - g.r - 44, opacity: vis(ys[0]) })}><Label>Lente</Label></div>
      {RANGES.map((txt, r) => {
        const on = emphRows.includes(r);
        const col = on ? mixColor(emph, B.c.charcoal, B.c.navy) : B.c.charcoal;
        const op = vis(ys[r]) * (on ? 1 : 1 - 0.55 * emph);
        return (
          <div key={r} style={lab({ top: ys[r] - 15, opacity: op, fontFamily: B.f.sans, fontWeight: 600, fontSize: 24, color: col })}>{r === 0 ? `${txt} Hz` : txt}</div>
        );
      })}
      <div style={lab({ top: rapY, opacity: vis(ys[4]) })}>
        <Label style={{ color: mixColor(rapideK, B.c.sage, B.c.navy) }}>Rapide</Label>
      </div>
    </div>
  );
};

const MapNotes: React.FC<{ k: number }> = ({ k }) => (
  <div style={{ position: 'absolute', left: WIN.x, top: 792, ...enter(k, 'up', 12) }}>
    <Note>Exemplu anonimizat<span style={{ color: B.c.goldDark }}> · </span>Exemplu ilustrativ, nu diagnostic.</Note>
  </div>
);

const entrance = (t: number, t0: number) => ({
  win: p(t, t0, t0 + 0.3),
  panel: p(t, t0 + 0.08, t0 + 0.48),
  axis: p(t, t0 + 0.2, t0 + 0.8),
  legend: p(t, t0 + 0.3, t0 + 0.7),
  notes: p(t, t0 + 0.35, t0 + 0.75),
});
const WinWrap: React.FC<{ k: number; children: React.ReactNode }> = ({ k, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: k, transform: `scale(${mix(1.04, 1, k)})`,
    transformOrigin: `${WIN.x + WIN.w / 2}px ${WIN.y + WIN.h / 2}px` }}>{children}</div>
);

/** Navy ring around one real circle (slightly tighter than CircleRing so neighbours never touch). */
const Ring: React.FC<{ name: MapName; box: Box; view: View; row: number; col: number; k: number; opacity?: number }> = ({ name, box, view, row, col, k, opacity = 1 }) => {
  if (k <= 0 || opacity <= 0) return null;
  const g = geom(name, box, view);
  const q = g.pos(row, col), r = g.r * 1.04;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity }}>
      <Draw d={`M${q.x} ${q.y - r} a${r} ${r} 0 1 1 -0.01 0`} k={k} color={B.c.navy} width={4} />
    </svg>
  );
};

// ─── Example 3 · monitor outline (tracked) ───────────────────────────────────
// Centres of the 4 corner circles of rows 19–45 Hz on the monitor (row 19 Hz col 1, row 19 Hz col 9, row 37 Hz col 1, row 37 Hz col 9),
// measured on every 2nd frame of vsl.mp4 (the handheld footage drifts ~25 px before settling).
const TRACK: number[][] = [
  [2289, 1146.9, 469.9, 1741.9, 477.8, 1142.0, 628.4, 1736.9, 655.4],
  [2290, 1146.6, 469.7, 1740.9, 477.6, 1141.9, 628.3, 1735.9, 655.3],
  [2292, 1144.6, 469.4, 1738.1, 477.3, 1140.5, 628.2, 1733.1, 655.2],
  [2294, 1142.5, 468.7, 1736.3, 476.9, 1138.5, 627.7, 1731.3, 654.6],
  [2296, 1140.7, 467.9, 1735.3, 476.0, 1136.5, 627.1, 1730.3, 654.1],
  [2298, 1139.0, 467.5, 1734.0, 475.7, 1134.7, 626.9, 1728.9, 653.7],
  [2300, 1137.5, 467.6, 1732.2, 475.9, 1132.7, 627.1, 1727.2, 654.0],
  [2302, 1135.5, 468.4, 1730.3, 476.8, 1130.7, 627.9, 1725.4, 654.8],
  [2304, 1133.8, 469.5, 1728.8, 478.1, 1128.9, 629.3, 1723.9, 656.3],
  [2306, 1131.9, 471.3, 1727.2, 480.0, 1127.1, 631.1, 1722.4, 658.1],
  [2308, 1131.2, 472.5, 1726.4, 481.4, 1126.9, 632.4, 1721.7, 659.6],
  [2310, 1130.1, 473.0, 1726.0, 481.8, 1125.1, 633.0, 1721.2, 660.0],
  [2312, 1129.3, 472.9, 1725.8, 481.7, 1125.0, 633.0, 1721.1, 660.0],
  [2314, 1129.1, 473.0, 1725.3, 481.8, 1124.1, 633.1, 1720.6, 660.3],
  [2316, 1128.1, 473.8, 1724.6, 482.6, 1123.0, 633.8, 1720.0, 660.9],
  [2318, 1127.4, 474.6, 1724.1, 483.6, 1122.4, 635.0, 1719.7, 662.1],
  [2320, 1127.3, 475.5, 1724.2, 484.5, 1122.4, 635.7, 1720.0, 662.9],
  [2322, 1127.2, 476.1, 1724.4, 485.0, 1122.2, 636.5, 1719.8, 663.7],
  [2324, 1127.0, 476.8, 1723.9, 485.9, 1122.1, 637.2, 1719.4, 664.4],
  [2326, 1126.4, 477.7, 1723.4, 486.7, 1121.3, 637.9, 1719.0, 665.4],
  [2328, 1126.2, 478.3, 1723.2, 487.4, 1121.0, 638.9, 1718.7, 666.2],
  [2330, 1126.1, 479.1, 1723.1, 488.3, 1120.4, 639.4, 1718.6, 666.9],
  [2332, 1126.2, 479.4, 1723.5, 488.7, 1120.5, 639.6, 1719.1, 667.4],
  [2334, 1126.4, 478.7, 1724.2, 488.0, 1120.7, 639.3, 1720.1, 667.0],
  [2336, 1126.4, 477.7, 1725.3, 486.9, 1120.8, 638.4, 1720.8, 666.0],
  [2338, 1126.6, 476.9, 1726.4, 486.1, 1121.1, 637.6, 1722.1, 665.1],
  [2340, 1126.8, 476.4, 1727.2, 485.7, 1121.7, 637.4, 1722.6, 665.0],
  [2342, 1126.9, 476.1, 1727.4, 485.3, 1121.7, 637.3, 1722.9, 664.8],
  [2344, 1126.9, 476.1, 1727.7, 485.3, 1121.7, 637.2, 1723.3, 664.9],
  [2346, 1127.1, 476.0, 1728.6, 485.4, 1121.7, 637.4, 1724.2, 665.2],
  [2348, 1127.7, 476.2, 1729.4, 485.8, 1121.8, 637.6, 1725.0, 665.6],
  [2350, 1128.0, 476.8, 1730.4, 486.4, 1122.1, 638.1, 1726.0, 666.3],
  [2352, 1128.9, 477.2, 1731.8, 486.7, 1123.2, 638.5, 1727.2, 666.7],
];
const trackAt = (frame: number) => {
  const i = TRACK.findIndex((r) => r[0] >= frame);
  if (i <= 0) return (i === 0 ? TRACK[0] : TRACK[TRACK.length - 1]).slice(1);
  const a = TRACK[i - 1], b = TRACK[i], k = (frame - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, j) => v + (b[j + 1] - v) * k);
};
const R_L = 29.5, R_R = 35.5;   // circle radius on screen: left column / right column (perspective)

/** Rounded quadrilateral through 4 corners (TL, TR, BR, BL), drawn from the top-left: top edge → right → bottom → left. */
const roundedQuad = (P: Array<[number, number]>, rr: number) => {
  const n = P.length;
  const towards = (a: [number, number], b: [number, number], d: number): [number, number] => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    return [a[0] + (dx / L) * d, a[1] + (dy / L) * d];
  };
  const A = P.map((c, i) => towards(c, P[(i - 1 + n) % n], rr));   // entry point of corner i
  const Bp = P.map((c, i) => towards(c, P[(i + 1) % n], rr));      // exit point of corner i
  let d = `M${Bp[0][0].toFixed(1)} ${Bp[0][1].toFixed(1)}`;
  for (let s = 1; s <= n; s++) {
    const i = s % n;
    d += ` L${A[i][0].toFixed(1)} ${A[i][1].toFixed(1)} Q${P[i][0].toFixed(1)} ${P[i][1].toFixed(1)} ${Bp[i][0].toFixed(1)} ${Bp[i][1].toFixed(1)}`;
  }
  return d;
};

const MonitorOutline: React.FC = () => {
  const t = useT();
  if (t < W3.mijloc - 0.05 || t >= T_JUMP) return null;
  const k = p(t, W3.mijloc - 0.05, W3.jos + 0.55, inOut);       // "de la mijloc în jos": top edge first, then down and around
  const fade = 1 - p(t, T_JUMP - 0.17, T_JUMP - 0.02);          // gone before the jump cut — never slides into the next shot
  const [tlx, tly, trx, try_, blx, bly, brx, bry] = trackAt(t * FPS);
  const P: Array<[number, number]> = [
    [tlx - R_L * 1.3, tly - R_L * 1.14],
    [trx + R_R * 1.3, try_ - R_R * 1.14],
    [brx + R_R * 1.3, bry + R_R * 1.45],
    [blx - R_L * 1.3, bly + R_L * 1.45],
  ];
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity: fade }}>
      <Draw d={roundedQuad(P, 16)} k={k} color={B.c.navy} width={4} />
    </svg>
  );
};

// ─── Example 3 · lower-third (bottom-left, under the face) ───────────────────
const LT = { x: 96, y: 640, w: 580, h: 196 };   // bottom 836 < 840; ≥ 47 px under the face even at 110 %
const LowerThird3: React.FC = () => {
  const t = useT();
  if (t < W3.aici || t >= T_FRONT4) return null;
  const k = win(t, W3.aici, T_FRONT4, 0.3, 0.001);              // leaves on the cut to the close-up
  const head = p(t, W3.mijloc, W3.mijloc + 0.4);
  const tail = p(t, W3.rosu - 0.05, W3.rosu + 0.35);
  const lab = p(t, T_JUMP, T_JUMP + 0.2);                         // on the jump cut: label leaves first…
  const sw = p(t, T_JUMP + 0.08, T_JUMP + 0.48, inOut);           // …row A moves up into its place…
  const rowB = p(t, T_JUMP + 0.35, T_JUMP + 0.75);               // …then "Activitate rapidă crescută" (on "E un creier")
  return (
    <div style={{ position: 'absolute', left: LT.x, top: LT.y, width: LT.w, height: LT.h, borderRadius: B.r.card, background: B.c.cream, ...enter(k, 'left') }}>
      <GoldBar style={{ position: 'absolute', left: 32, top: 24 }} />
      <div style={{ position: 'absolute', left: 32, top: 40 - 12 * lab, opacity: 1 - lab }}>
        <ExampleHead n={3} done={2} cur={2} />
      </div>
      <div style={{ position: 'absolute', left: 32, right: 24, top: mix(84, 40, sw) }}>
        <ReadRow k={head} kTail={tail} text="De la mijloc în jos: mult roșu"
          after={<span style={{ display: 'inline-block', position: 'relative', width: 34, height: 34, marginLeft: 14, verticalAlign: '-6px', ...enter(tail, 'left', 8) }}>
            <CircleSample {...RED3} x={0} y={0} d={34} />
          </span>} />
      </div>
      <div style={{ position: 'absolute', left: 32, right: 24, top: 90 }}>
        <ReadRow k={rowB} text="Activitate rapidă crescută" />
      </div>
      <Note style={{ position: 'absolute', left: 32, top: 142 }}>Exemplu anonimizat</Note>
    </div>
  );
};

// ─── Example 4 · FRONTAL 85.733–87.467 ───────────────────────────────────────
const Frontal4: React.FC = () => {
  const t = useT();
  if (t < T_FRONT4 || t >= T_PRIV0) return null;
  return (
    <Card start={T_FRONT4 + 0.2} end={T_PRIV0} x={1224} y={160} w={480} from="right" pad={36} outS={0.001}>
      <ExampleHead n={4} done={3} cur={3} />
    </Card>
  );
};

// ─── Example 4 · MapReader (PRIVACY COVER) 87.467–93.15 ──────────────────────
const Reader4: React.FC = () => {
  const t = useT();
  if (t < T_PRIV0 || t >= T_PRIV1) return null;
  const name: MapName = 'map4_obosit';
  const e = entrance(t, T_PRIV0);
  const view = zoomView(fullView(name), 1 + 0.035 * inOut(lin(t, T_PRIV0, T_PRIV1)), 0.5, 0.78);   // gentle push towards the fast rows
  const focus = p(t, W4.creier, W4.creier + 0.45);               // "creier": focus on rows 19–45 Hz
  const bracket = p(t, W4.creier + 0.1, W4.creier + 0.65);
  const row1 = p(t, W4.ceata, W4.ceata + 0.4);                    // "ceață"
  const legHi = p(t, W4.ceata, W4.ceata + 0.45);
  const row2 = p(t, W4.trezesti, W4.trezesti + 0.4);              // "trezești"
  const dotFill = p(t, W4.ziua - 0.1, W4.ziua + 0.3);
  return (
    <Scene start={T_PRIV0} end={T_PRIV1} tone="cream" enterMode="cut">
      <Panel k={e.panel} n={4} done={3} cur={3} fill={dotFill} title="Un alt tipar"
        rows={[{ k: row1, text: 'Frecvențele rapide: mult albastru' }, { k: row2, text: 'Sub valorile de referință' }]} />
      <MiniLegend x={LEG_PANEL.x} y={LEG_PANEL.y} k={e.legend} hi="blue" hiK={legHi} framed />
      <AxisBand name={name} box={WIN} view={view} k={e.axis} emph={focus} emphRows={[2, 3, 4]} rapideK={row1} />
      <WinWrap k={e.win}>
        <MapWindow name={name} box={WIN} view={view} reveal={focus > 0 ? (r) => (r < 2 ? 1 - 0.42 * focus : 1) : undefined} />
        <RowBracket name={name} box={WIN} view={view} r0={2} r1={4} k={bracket} side="right" />
      </WinWrap>
      <MapNotes k={e.notes} />
    </Scene>
  );
};

// ─── Example 5 · FRONTAL 93.167–95.067 ───────────────────────────────────────
const Frontal5: React.FC = () => {
  const t = useT();
  if (t < T_FRONT5 || t >= T_LAT5) return null;
  const kV = p(t, W5.echilibrat - 0.05, W5.echilibrat + 0.35);
  const fill = p(t, W5.echilibrat, W5.echilibrat + 0.4);
  return (
    <>
      <Card start={T_FRONT5} end={T_LAT5} x={1224} y={160} w={600} from="right" pad={40} outS={0.001}>
        <ExampleHead n={5} done={4} cur={4} fill={fill} />
        <Title size={44} style={{ marginTop: 18, display: 'flex', alignItems: 'center', ...enter(kV, 'up', 12) }}>
          Mult verde
          <span style={{ display: 'inline-block', position: 'relative', width: 48, height: 48, marginLeft: 18 }}>
            <CircleSample {...GREEN5} x={0} y={0} d={48} />
          </span>
        </Title>
      </Card>
      <MiniLegend x={LEG_FRONT.x} y={LEG_FRONT.y} k={p(t, T_FRONT5 + 0.15, T_FRONT5 + 0.55)} hi="green" hiK={kV} />
    </>
  );
};

// ─── Example 5 · MapReader 96.68–104.4 ───────────────────────────────────────
const SPOTS: Array<[number, number]> = [[3, 1], [3, 2], [3, 3]];   // the red spots at 29, 30, 31 Hz
const Reader5: React.FC = () => {
  const t = useT();
  if (t < T_MAP5 || t >= T_END) return null;
  const name: MapName = 'map5_echilibru';
  const e = entrance(t, T_MAP5);
  const view = zoomView(fullView(name), 0.965 + 0.02 * inOut(lin(t, T_MAP5, T_END)), 0.5, 0.5);   // starts slightly zoomed out: room for the whole-map outline
  const rings = SPOTS.map((_, i) => p(t, W5.rosii + 0.12 * i, W5.rosii + 0.12 * i + 0.55, inOut));
  const ringsOut = 1 - p(t, W5.vrem, W5.vrem + 0.35);
  const row1 = p(t, W5.rosii, W5.rosii + 0.4);                    // "Câteva zone roșii:"
  const row1t = p(t, W5.firesc - 0.05, W5.firesc + 0.35);         // "… firesc"
  const row2 = p(t, W5.nu, W5.nu + 0.4);                          // "nu vrem să fim roboți"
  const row3 = p(t, W5.vrem + 0.15, W5.vrem + 0.55);              // "Vrem … un echilibru sănătos"
  const outline = p(t, W5.vrem + 0.05, W5.vrem + 0.95, inOut);
  const redHi = p(t, W5.rosii, W5.rosii + 0.45) * (1 - p(t, W5.vrem, W5.vrem + 0.3));
  const greenHi = p(t, W5.vrem + 0.3, W5.vrem + 0.75);
  return (
    <Scene start={T_MAP5} end={T_END} tone="cream" enterMode="fade">
      <Panel k={e.panel} n={5} done={5} cur={-1} fill={0} title="Tipar echilibrat"
        rows={[{ k: row1, kTail: row1t, text: 'Câteva zone roșii: firesc' }, { k: row2, text: 'Echilibru, nu perfecțiune' }, { k: row3, text: 'Verde: în intervalul de referință' }]} />
      <MiniLegend x={LEG_PANEL.x} y={LEG_PANEL.y} k={e.legend} hi={t < W5.vrem + 0.3 ? 'red' : 'green'} hiK={t < W5.vrem + 0.3 ? redHi : greenHi} framed />
      <AxisBand name={name} box={WIN} view={view} k={e.axis} />
      <WinWrap k={e.win}>
        <MapWindow name={name} box={WIN} view={view} />
        {SPOTS.map(([r, c], i) => <Ring key={i} name={name} box={WIN} view={view} row={r} col={c} k={rings[i]} opacity={ringsOut} />)}
        <RowOutline name={name} box={WIN} view={view} r0={0} r1={4} k={outline} />
      </WinWrap>
      <MapNotes k={e.notes} />
    </Scene>
  );
};

const Ch: React.FC = () => (
  <>
    <MonitorOutline />
    <LowerThird3 />
    <Frontal4 />
    <Reader4 />
    <Frontal5 />
    <Reader5 />
  </>
);
export default Ch;
