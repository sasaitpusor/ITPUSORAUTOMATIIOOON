// Chapter 02 · part A — examples 1 and 2 (OUTPUT 43.867–76.0 s) · beats B14–B19.
// 43.867–47.133 FRONTAL: card "EXEMPLUL 1 DIN 5" (right) + MiniLegend (bottom-right). Pill 02 is drawn by core (top-left kept free).
// 47.133–62.2   MapReader on cream over the shaky screen insert: clean map1_alerta, reading steps synced to the words.
// 62.2–64.233   FRONTAL: card "EXEMPLUL 2 DIN 5 · Aproape totul albastru" + MiniLegend.
// 64.233–76.0   MapReader on cream over the screen insert: clean map2_albastru, outline + reading rows + handbrake icon.
import React from 'react';
import { Easing } from 'remotion';
import { B, FPS } from '../brand';
import { enter, lin, mix, mixColor, p, useT } from '../lib';
import { Card, Draw, GoldBar, Label, Note, Scene, Title } from '../ui/kit';
import { Box, CircleSample, MAPS, MapImage, MapName, RowBracket, RowOutline, View, fullView, geom, lerpView } from '../ui/maps';

export const NAVY: Array<[number, number]> = [];       // all full-screen scenes here are cream
export const HIDE_SUBS: Array<[number, number]> = [];

// ─── Timing (exact cut frames, checked on vsl.mp4) ───────────────────────────
const fr = (n: number) => n / FPS;
const T_CH = fr(1316);    // 43.867 chapter 02 starts (FRONTAL)
const T_EX1 = fr(1414);   // 47.133 cut → screen insert, example 1
const T_EX2C = fr(1866);  // 62.200 cut → FRONTAL, example 2 card
const T_EX2 = fr(1927);   // 64.233 cut → screen insert, example 2
const T_CUT2 = fr(2199);  // 73.300 internal cut inside insert 2 (hidden under MapReader)
const T_END = fr(2280);   // 76.000 cut → LATERAL (ch02b)

// word onsets (subs_out.json)
const W1 = { epuizarea: 44.66, jos: 47.22, tot: 47.5, rapide: 48.61, rosu: 49.69, viteza: 52.13, alerta: 53.67, continua: 56.28, merg: 57.32, frana: 59.72 };
const W2 = { aproape: 62.7, albastru: 63.48, vedem: 64.48, care: 65.22, nimic: 66.08, tras: 69.92, frana: 70.14, mana: 70.52 };

const inOut = Easing.inOut(Easing.cubic);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ─── Layout (MapReader, cream) ───────────────────────────────────────────────
const WIN: Box = { x: 704, y: 120, w: 1120, h: 656 };   // map window
const PANEL = { x: 96, y: 120, w: 470 };                // left panel
const AXIS_R = 692;                                      // right edge of the Hz labels
const AXIS_ARROW_X = 600;
const LEG_PANEL = { x: 96, y: 716 };                    // MiniLegend inside the MapReader panel
const LEG_FRONT = { x: 1224, y: 748 };                  // MiniLegend in FRONTAL shots

/** Ken Burns helper: shrink a view by z around a relative anchor (ax, ay). */
const zoomView = (v: View, z: number, ax = 0.5, ay = 0.5): View => {
  const w = (v.x1 - v.x0) / z, h = (v.y1 - v.y0) / z;
  const cx = v.x0 + (v.x1 - v.x0) * ax, cy = v.y0 + (v.y1 - v.y0) * ay;
  return { x0: cx - w * ax, y0: cy - h * ay, x1: cx - w * ax + w, y1: cy - h * ay + h };
};
const lerpBox = (a: Box, b: Box, k: number): Box => ({ x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), w: mix(a.w, b.w, k), h: mix(a.h, b.h, k) });

// Crop of rows 3–4 (28–45 Hz) of map 1, with room on the right for the bracket.
const M1 = MAPS.map1_alerta;
const STRIP_VIEW: View = {
  x0: M1.c[3][0][0] - M1.r * 1.3, x1: M1.c[3][8][0] + M1.r * 2.3,
  y0: M1.c[3][0][1] - M1.r * 1.3, y1: M1.c[4][0][1] + M1.r * 1.75,
};
const STRIP_H = Math.round((WIN.w * (STRIP_VIEW.y1 - STRIP_VIEW.y0)) / (STRIP_VIEW.x1 - STRIP_VIEW.x0));
const STRIP_BOX: Box = { x: WIN.x, y: 288, w: WIN.w, h: STRIP_H };

// Real colour samples for the legend (cropped from real maps — never drawn).
type Hue = 'blue' | 'green' | 'red';
const SAMPLE: Record<Hue, { name: MapName; row: number; col: number }> = {
  blue: { name: 'map2_albastru', row: 1, col: 3 },
  green: { name: 'map1_alerta', row: 2, col: 3 },
  red: { name: 'map2_albastru', row: 0, col: 8 },
};

// ─── Small parts ─────────────────────────────────────────────────────────────
/** 5 progress dots: done = filled, current = ring + core that fills (fill 0→1), rest = faint ring. */
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

/** Label "EXEMPLUL n DIN 5" + dots. */
const ExampleHead: React.FC<{ n: number; done: number; cur: number; fill?: number }> = ({ n, done, cur, fill }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
    <Label>{`Exemplul ${n} din 5`}</Label>
    <Dots done={done} cur={cur} fill={fill} />
  </div>
);

/** MiniLegend: three real samples + "sub · în · peste referință". Fixed slots so the red sample position is known. */
const LEG_SLOTS: Record<Hue, number> = { blue: 18, green: 134, red: 230 };
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
            <div style={{ position: 'absolute', left: sx + LEG_D + 14, top: 0, height: LEG_H - (framed ? 4 : 0), display: 'flex', alignItems: 'center',
              fontFamily: B.f.sans, fontWeight: 600, fontSize: 24, color: hi === h ? mixColor(hiK, B.c.charcoal, B.c.navy) : B.c.charcoal, opacity: op(h), whiteSpace: 'nowrap' }}>
              {words[h]}
            </div>
            {hi === h && hiK > 0 && (
              <svg width={LEG_D + 16} height={LEG_D + 16} style={{ position: 'absolute', left: sx - 8, top: sy - 8, overflow: 'visible' }}>
                <Draw d={`M${(LEG_D + 16) / 2} 3 a${LEG_D / 2 + 5} ${LEG_D / 2 + 5} 0 1 1 -0.01 0`} k={hiK} color={B.c.navy} width={3} />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** ReadingCard row: a gold rule that grows + the text sliding in. Prefix before ':' in navy. */
const ReadRow: React.FC<{ k: number; text: string }> = ({ k, text }) => {
  if (k <= 0) return null;
  const i = text.indexOf(':');
  const head = i > 0 ? text.slice(0, i + 1) : '';
  const tail = i > 0 ? text.slice(i + 1) : text;
  const kt = clamp01((k - 0.15) / 0.85);
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 18 }}>
      <div style={{ width: 4, borderRadius: 2, background: B.c.goldDark, transform: `scaleY(${k})`, transformOrigin: 'top', flexShrink: 0 }} />
      <div style={{ fontFamily: B.f.sans, fontWeight: 600, fontSize: 30, lineHeight: 1.25, color: B.c.charcoal, padding: '2px 0', ...enter(kt, 'left', 16) }}>
        {head && <span style={{ color: B.c.navy }}>{head}</span>}{tail}
      </div>
    </div>
  );
};

/** Left panel of the MapReader. */
const Panel: React.FC<{ k: number; n: number; done: number; cur: number; fill: number; title: string; rows: Array<{ k: number; text: string }>; children?: React.ReactNode }> = ({ k, n, done, cur, fill, title, rows, children }) => (
  <div style={{ position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, ...enter(k, 'left') }}>
    <GoldBar style={{ marginBottom: 18 }} />
    <ExampleHead n={n} done={done} cur={cur} fill={fill} />
    <Title size={44} style={{ marginTop: 18 }}>{title}</Title>
    <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {rows.map((r, i) => <ReadRow key={i} k={r.k} text={r.text} />)}
    </div>
    {children}
  </div>
);

/** Map window: real image, Ken Burns via `view`, thin sage frame. */
const MapWindow: React.FC<{ name: MapName; box: Box; view: View; reveal?: (r: number, c: number) => number }> = ({ name, box, view, reveal }) => (
  <>
    <MapImage name={name} box={box} view={view} radius={B.r.card} bg="#F7F7F7" reveal={reveal} />
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: B.r.card, border: `2px solid ${B.c.sageLine}`, boxSizing: 'border-box' }} />
  </>
);

/** Axis band left of the window: LENTE ↓ RAPIDE with the Hz range of every visible row (follows the Ken Burns). */
const RANGES = ['1–9', '10–18', '19–27', '28–36', '37–45'];
const AxisBand: React.FC<{ name: MapName; box: Box; view: View; k: number; emph?: number; emphRows?: number[]; rapideK?: number; underlineK?: number; cropK?: number }> = ({ name, box, view, k, emph = 0, emphRows = [], rapideK = 0, underlineK = 0, cropK = 0 }) => {
  if (k <= 0) return null;
  const g = geom(name, box, view);
  const vis = (y: number) => clamp01((y - box.y - g.r * 0.35) / 26) * clamp01((box.y + box.h - y - g.r * 0.35) / 26);
  const ys = [0, 1, 2, 3, 4].map((r) => g.pos(r, 0).y);
  const lab = (style: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', right: 1920 - AXIS_R, height: 30, lineHeight: '30px', whiteSpace: 'nowrap', ...style });
  const yTop = ys[0] - g.r * 0.7, yBot = ys[4] + g.r * 0.7;
  const rapY = ys[4] + g.r + 14;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: k }}>
      {/* vertical arrow slow → fast (hidden while the window shows only the fast rows) */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - clamp01(cropK * 2.5) }}>
        <Draw d={`M${AXIS_ARROW_X} ${yTop} L${AXIS_ARROW_X} ${yBot}`} k={k} width={3} />
        <Draw d={`M${AXIS_ARROW_X - 9} ${yBot - 11} L${AXIS_ARROW_X} ${yBot} L${AXIS_ARROW_X + 9} ${yBot - 11}`} k={p(k, 0.6, 1)} width={3} />
      </svg>
      <div style={lab({ top: ys[0] - g.r - 44, opacity: vis(ys[0]) })}><Label>Lente</Label></div>
      {RANGES.map((txt, r) => {
        const on = emphRows.includes(r);
        const col = on ? mixColor(emph, B.c.charcoal, B.c.navy) : B.c.charcoal;
        const op = vis(ys[r]) * (on ? 1 : 1 - 0.55 * emph);
        const base: React.CSSProperties = { fontFamily: B.f.sans, fontWeight: 600, fontSize: 24, color: col };
        const hz = r === 0 ? 1 : r === 3 ? clamp01(cropK * 2 - 1) : 0;   // "Hz" once, on the top-most visible row
        return (
          <React.Fragment key={r}>
            <div style={lab({ top: ys[r] - 15, opacity: op * (1 - (r === 3 ? clamp01(cropK * 2) : 0)), ...base })}>{r === 0 ? `${txt} Hz` : txt}</div>
            {r === 3 && hz > 0 && <div style={lab({ top: ys[r] - 15, opacity: op * hz, ...base })}>{`${txt} Hz`}</div>}
          </React.Fragment>
        );
      })}
      <div style={lab({ top: rapY, opacity: vis(ys[4]) })}>
        <Label style={{ color: mixColor(rapideK, B.c.sage, B.c.navy) }}>Rapide</Label>
      </div>
      {underlineK > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: vis(ys[4]) }}>
          <Draw d={`M${AXIS_R - 4} ${rapY + 34} L${AXIS_R - 104} ${rapY + 34}`} k={underlineK} width={3} />
        </svg>
      )}
    </div>
  );
};

/** Compliance notes under the window. */
const MapNotes: React.FC<{ k: number }> = ({ k }) => (
  <div style={{ position: 'absolute', left: WIN.x, top: 792, ...enter(k, 'up', 12) }}>
    <Note>Exemplu anonimizat<span style={{ color: B.c.goldDark }}> · </span>Exemplu ilustrativ, nu diagnostic.</Note>
  </div>
);

/** Handbrake line icon (metaphor only, no text): lever lifts 12° with `lift`. */
const Handbrake: React.FC<{ x: number; y: number; k: number; lift: number; opacity: number }> = ({ x, y, k, lift, opacity }) => (
  <svg width={212} height={162} viewBox="0 0 170 130" style={{ position: 'absolute', left: x, top: y, opacity, overflow: 'visible' }}>
    {/* console */}
    <Draw d="M12 120 L30 98 H88 L106 120 Z" k={p(k, 0, 0.55)} />
    {/* lever: shaft + grip ribs + release button, pivoting on the console */}
    <g transform={`translate(46 100) rotate(${-20 - 12 * lift})`}>
      <Draw d="M0 -7 H100 Q107 -7 107 0 Q107 7 100 7 H0 Q-7 7 -7 0 Q-7 -7 0 -7 Z" k={p(k, 0.2, 0.9)} />
      <Draw d="M64 -7 V7 M76 -7 V7 M88 -7 V7" k={p(k, 0.55, 1)} width={3} />
      <Draw d="M107 -4 H113 Q116 -4 116 0 Q116 4 113 4 H107" k={p(k, 0.7, 1)} width={3} />
    </g>
    <circle cx={46} cy={100} r={4.5} fill={B.c.goldDark} opacity={p(k, 0.5, 1)} />
  </svg>
);

/** Entrance of a MapReader scene: window fades in 104→100 %, panel slides, the rest follows. */
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

// ─── FRONTAL 43.867–47.133 · B14 ─────────────────────────────────────────────
const Frontal1: React.FC = () => {
  const t = useT();
  if (t < T_CH || t >= T_EX1) return null;
  return (
    <>
      <Card start={W1.epuizarea - 0.04} end={T_EX1} x={1224} y={160} w={600} from="right" pad={40} outS={0.001}>
        <ExampleHead n={1} done={0} cur={0} />
        <Title size={44} style={{ marginTop: 18 }}>Tipar întâlnit la stres prelungit</Title>
        <Note style={{ marginTop: 24 }}>Exemplu ilustrativ, nu diagnostic.</Note>
      </Card>
      <MiniLegend x={LEG_FRONT.x} y={LEG_FRONT.y} />
    </>
  );
};

// ─── MapReader 1 · 47.133–62.2 · B15–B16 ─────────────────────────────────────
const Reader1: React.FC = () => {
  const t = useT();
  if (t < T_EX1 || t >= T_EX2C) return null;
  const name: MapName = 'map1_alerta';
  const e = entrance(t, T_EX1);

  // camera on the clean image: gentle Ken Burns towards the bottom rows, then the crop of rows 3–4 on "continuă"
  const kb = inOut(lin(t, T_EX1, W1.continua + 0.5));
  const vFull = zoomView(fullView(name), 1 + 0.03 * kb, 0.5, 0.86);
  const vStrip = zoomView(STRIP_VIEW, 1 + 0.02 * lin(t, W1.continua, T_EX2C), 0.5, 0.5);
  const crop = p(t, W1.continua - 0.05, W1.continua + 0.45, inOut);
  const box = lerpBox(WIN, STRIP_BOX, crop);
  const view = lerpView(vFull, vStrip, crop);

  // reading steps
  const dim = p(t, W1.jos, W1.jos + 0.4) * (1 - crop);                 // "Jos de tot": focus on rows 3–4
  const bracket = p(t, W1.jos + 0.1, W1.jos + 0.65);                    // bracket on rows 3–4
  const row1 = p(t, W1.rapide, W1.rapide + 0.4);                        // "rapide"
  const row2 = p(t, W1.rosu, W1.rosu + 0.4);                            // "roșu"
  const legHi = p(t, W1.rosu, W1.rosu + 0.45);
  const underline = p(t, W1.viteza, W1.viteza + 0.5);                   // "viteza asta" → RAPIDE
  const row3 = p(t, W1.alerta, W1.alerta + 0.4);                        // "alertă maximă"
  const chip = p(t, W1.continua + 0.3, W1.continua + 0.7);              // "28–45 Hz" on the bracket
  const ringOn = p(t, W1.merg - 0.15, W1.merg + 0.15) * (1 - p(t, W1.frana + 0.05, W1.frana + 0.35));
  const fly = p(t, W1.frana, W1.frana + 0.6, inOut);                    // red sample slides from the legend to the rows
  const flyLabel = p(t, W1.frana + 0.4, W1.frana + 0.8);
  const dotFill = p(t, W1.frana, W1.frana + 0.4);

  const g = geom(name, box, view);
  // reading highlighter: glides across the 18 circles of rows 3–4 (28 → 45 Hz) while "îi merg gândurile întruna…"
  const u = lin(t, W1.merg, W1.frana - 0.2) * 17;
  const i0 = Math.min(16, Math.floor(u)), fu = u - i0;
  const P = (i: number) => g.pos(i < 9 ? 3 : 4, i < 9 ? i : i - 9);
  const gl = Easing.out(Easing.cubic)(clamp01(fu / 0.55));
  const a = P(i0), b = P(i0 + 1);
  const ring = { x: mix(a.x, b.x, u >= 17 ? 1 : gl), y: mix(a.y, b.y, u >= 17 ? 1 : gl) };

  // bracket end (for the chip)
  const top8 = g.pos(3, 8);
  const brX = top8.x + g.r * 1.35, brY = top8.y - g.r * 0.95;

  // flying red sample: legend slot → under the strip
  const from = { x: LEG_PANEL.x + LEG_SLOTS.red, y: LEG_PANEL.y + (LEG_H - LEG_D) / 2, d: LEG_D };
  const to = { x: WIN.x + 40, y: STRIP_BOX.y + STRIP_BOX.h + 34, d: 56 };

  return (
    <Scene start={T_EX1} end={T_EX2C} tone="cream" enterMode="cut">
      <Panel k={e.panel} n={1} done={0} cur={0} fill={dotFill} title="Tipar întâlnit la stres prelungit"
        rows={[{ k: row1, text: 'Jos: frecvențele rapide' }, { k: row2, text: 'Mult roșu: peste referință' }, { k: row3, text: 'Activare crescută' }]} />
      <MiniLegend x={LEG_PANEL.x} y={LEG_PANEL.y} k={e.legend} hi="red" hiK={legHi} framed />
      <AxisBand name={name} box={box} view={view} k={e.axis} emph={p(t, W1.jos, W1.jos + 0.4)} emphRows={[3, 4]} rapideK={p(t, W1.rapide, W1.rapide + 0.4)} underlineK={underline} cropK={crop} />
      <WinWrap k={e.win}>
        <MapWindow name={name} box={box} view={view} reveal={dim > 0 ? (r) => (r < 3 ? 1 - 0.42 * dim : 1) : undefined} />
        <RowBracket name={name} box={box} view={view} r0={3} r1={4} k={bracket} side="right" />
        {ringOn > 0 && (
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: ringOn }}>
            <circle cx={ring.x} cy={ring.y} r={g.r * 1.07} fill="none" stroke={B.c.navy} strokeWidth={4} />
          </svg>
        )}
      </WinWrap>
      {chip > 0 && (
        <div style={{ position: 'absolute', right: 1920 - brX - 2, top: brY - 58, height: 50, padding: '0 16px', borderRadius: 12, background: B.c.cream,
          border: `2px solid ${B.c.navy}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center',
          fontFamily: B.f.sans, fontWeight: 600, fontSize: 30, color: B.c.navy, whiteSpace: 'nowrap', ...enter(chip, 'up', 12) }}>
          28–45 Hz
        </div>
      )}
      {fly > 0 && (
        <>
          <CircleSample {...SAMPLE.red} x={mix(from.x, to.x, fly)} y={mix(from.y, to.y, fly)} d={mix(from.d, to.d, fly)} />
          <div style={{ position: 'absolute', left: to.x + to.d + 18, top: to.y, height: to.d, display: 'flex', alignItems: 'center',
            fontFamily: B.f.sans, fontWeight: 600, fontSize: 30, color: B.c.navy, whiteSpace: 'nowrap', ...enter(flyLabel, 'left', 12) }}>
            = peste referință
          </div>
        </>
      )}
      <MapNotes k={e.notes} />
    </Scene>
  );
};

// ─── FRONTAL 62.2–64.233 · B17 ───────────────────────────────────────────────
const Frontal2: React.FC = () => {
  const t = useT();
  if (t < T_EX2C || t >= T_EX2) return null;
  const kA = p(t, W2.aproape, W2.aproape + 0.4), kB = p(t, W2.albastru, W2.albastru + 0.4);
  return (
    <>
      <Card start={T_EX2C} end={T_EX2} x={1224} y={160} w={600} from="right" pad={40} outS={0.001}>
        <ExampleHead n={2} done={1} cur={1} />
        <Title size={44} style={{ marginTop: 18 }}>
          <span style={{ display: 'inline-block', ...enter(kA, 'up', 12) }}>Aproape totul</span>{' '}
          <span style={{ display: 'inline-block', ...enter(kB, 'up', 12) }}>albastru</span>
          <span style={{ display: 'inline-block', position: 'relative', width: 48, height: 48, marginLeft: 16, verticalAlign: '-6px', ...enter(kB, 'up', 12) }}>
            <CircleSample {...SAMPLE.blue} x={0} y={0} d={48} />
          </span>
        </Title>
      </Card>
      <MiniLegend x={LEG_FRONT.x} y={LEG_FRONT.y} />
    </>
  );
};

// ─── MapReader 2 · 64.233–76.0 · B18–B19 ─────────────────────────────────────
const Reader2: React.FC = () => {
  const t = useT();
  if (t < T_EX2 || t >= T_END) return null;
  const name: MapName = 'map2_albastru';
  const e = entrance(t, T_EX2);
  const view = zoomView(fullView(name), 1 + 0.03 * inOut(lin(t, T_EX2, T_END)), 0.5, 0.5);
  const outline = p(t, W2.vedem, W2.vedem + 0.7, inOut);              // whole grid: "aproape toată harta"
  const row1 = p(t, W2.care, W2.care + 0.4);
  const legHi = p(t, W2.care, W2.care + 0.45);
  const row2 = p(t, W2.nimic + 0.2, W2.nimic + 0.6);
  const brake = p(t, W2.tras, W2.tras + 0.55);                           // "a tras frâna de mână" (metaphor only)
  const lift = p(t, W2.mana - 0.1, W2.mana + 0.35, inOut);
  const brakeOut = 1 - p(t, T_CUT2, T_CUT2 + 0.3);                       // fades exactly on the hidden cut
  const dotFill = p(t, T_CUT2, T_CUT2 + 0.4);
  return (
    <Scene start={T_EX2} end={T_END} tone="cream" enterMode="cut">
      <Panel k={e.panel} n={2} done={1} cur={1} fill={dotFill} title="Aproape totul albastru"
        rows={[{ k: row1, text: 'Pe aproape toate frecvențele' }, { k: row2, text: 'Sub valorile de referință' }]} />
      {brake > 0 && brakeOut > 0 && <Handbrake x={PANEL.x - 6} y={478} k={brake} lift={lift} opacity={brakeOut} />}
      <MiniLegend x={LEG_PANEL.x} y={LEG_PANEL.y} k={e.legend} hi="blue" hiK={legHi} framed />
      <AxisBand name={name} box={WIN} view={view} k={e.axis} />
      <WinWrap k={e.win}>
        <MapWindow name={name} box={WIN} view={view} />
        <RowOutline name={name} box={WIN} view={view} r0={0} r1={4} k={outline} />
      </WinWrap>
      <MapNotes k={e.notes} />
    </Scene>
  );
};

const Ch: React.FC = () => (
  <>
    <Frontal1 />
    <Reader1 />
    <Frontal2 />
    <Reader2 />
  </>
);
export default Ch;
