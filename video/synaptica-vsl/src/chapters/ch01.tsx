// Chapter 01 — „Cum se citește harta” · output 21.167–43.867 s · beats B07–B12.
//  A) 21.167–30.067  MapReader lesson on cream (cut in / cut out) on the REAL map 1:
//     one circle = one frequency → reading order 1…45 Hz → row ranges on the axis → slow vs fast waves → top = slow, bottom = fast.
//  B) 30.067–43.867  LegendGauge card (right panel) built from REAL circle crops: blue below / green inside / red above the reference band,
//     then (43.40–43.80) it folds into the MiniLegend bar that the next chapter keeps.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { B } from '../brand';
import { enter, mix, p, useT } from '../lib';
import { Draw, GoldBar, Illustrative, Label, Note, Scene, Title } from '../ui/kit';
import { CircleSample, MapImage, MapName, RowBracket, geom, rowsView } from '../ui/maps';
import { WaveGlyph } from '../ui/media';
import subs from '../data/subs_out.json';

export const NAVY: Array<[number, number]> = [];       // cream scenes only
export const HIDE_SUBS: Array<[number, number]> = [];

// ─── timing (output seconds), synced to the spoken words ───────────────────
const WORDS = (subs as { words: { t: string; s: number }[] }).words;
const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:„”"…]/g, '');
/** Onset of word `w` closest to `near` (falls back to `near`). */
const wt = (w: string, near: number) => {
  let best = near, d = 1.2;
  for (const x of WORDS) { const dd = Math.abs(x.s - near); if (norm(x.t) === w && dd < d) { d = dd; best = x.s; } }
  return best;
};
const T0 = 21.167, T_LEG = 30.067, T_END = 43.867;
const W = {
  cerc: wt('cerc', 21.4), frec: wt('frecvență', 22.08), n45: wt('45', 23.72),
  lente: wt('lente', 25.48), rapide: wt('rapide', 26.38), sus: wt('sus', 26.88), jos: wt('jos', 28.62),
  albastru: wt('albastru', 30.46), deficit: wt('deficit', 31.24), rosu: wt('roșu', 35.58), exces: wt('exces', 36.48),
  verde: wt('verde', 39.72), echilibru: wt('echilibru', 40.5),
};

// ═════════════════════════════ A) MAP READER LESSON ═════════════════════════════
const MAP: MapName = 'map1_alerta';
const BOX = { x: 704, y: 120, w: 1120, h: 656 };
const VIEW = rowsView(MAP, 0, 4);
const G = geom(MAP, BOX, VIEW);
const ROW_Y = [0, 1, 2, 3, 4].map((r) => G.pos(r, 0).y);
const RANGES = ['1–9', '10–18', '19–27', '28–36', '37–45'];
const SWEEP_A = W.frec + 0.54, SWEEP_B = W.n45 + 0.08;   // reading-order sweep 1 → 45 Hz, lands on „45”
const STEP = (SWEEP_B - SWEEP_A) / 44;
const PANEL_OUT: [number, number] = [24.45, 24.75];     // lesson intro text leaves in the pause after „45.”

/** Row emphasis for „Sus” / „jos”: the other rows step back to 40 %. */
const rowFocus = (t: number, r: number) => {
  const kS = p(t, W.sus, W.sus + 0.35), kJ = p(t, W.jos, W.jos + 0.35);
  if (r === 0) return 1;
  if (r === 4) return 1 - 0.6 * kS * (1 - kJ);
  return 1 - 0.6 * kS;
};

const sans = (size: number, weight: 400 | 600 = 600, color: string = B.c.charcoal): React.CSSProperties =>
  ({ fontFamily: B.f.sans, fontWeight: weight, fontSize: size, lineHeight: 1.25, color });
const numStyle: React.CSSProperties = { fontFamily: B.f.serif, fontVariationSettings: B.f.serifDisplay, fontWeight: 400, fontSize: 88, lineHeight: 1, color: B.c.navy, fontVariantNumeric: 'tabular-nums' };

/** Navy ring hugging one circle of the lesson map (tighter than CircleRing so the printed „N Hz” label stays readable). */
const Ring: React.FC<{ row: number; col: number; k: number }> = ({ row, col, k }) => {
  const q = G.pos(row, col), r = G.r * 1.03;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Draw d={`M${q.x} ${q.y - r} a${r} ${r} 0 1 1 -0.01 0`} k={k} color={B.c.navy} width={4} />
    </svg>
  );
};

/** A stylised wave + its name; glides to the row it belongs to. */
const WaveBlock: React.FC<{ t: number; y: number; cycles: number; speed: number; name: string; tag: string; k: number; kDraw: number; kTag: number }> = ({ t, y, cycles, speed, name, tag, k, kDraw, kTag }) => (
  <div style={{ position: 'absolute', left: 96, top: y - 40, height: 80, display: 'flex', alignItems: 'center', gap: 26, ...enter(k, 'up', 16) }}>
    <WaveGlyph w={200} h={80} cycles={cycles} t={t} speed={speed} k={kDraw} color={B.c.goldDark} width={4} amp={0.36} />
    <div style={{ position: 'relative' }}>
      <Label style={{ position: 'absolute', bottom: '100%', marginBottom: 2, opacity: kTag, transform: `translateY(${(1 - kTag) * 8}px)` }}>{tag}</Label>
      <div style={sans(32)}>{name}</div>
    </div>
  </div>
);

const Lesson: React.FC = () => {
  const t = useT();
  const kWin = p(t, T0, T0 + 0.3);
  const kPanel = p(t, T0 + 0.03, T0 + 0.4);
  const outIntro = 1 - p(t, ...PANEL_OUT);
  const dimK = p(t, W.frec + 0.24, W.frec + 0.52);
  const reveal = (r: number, c: number) => {
    const idx = r * 9 + c, ti = SWEEP_A + idx * STEP;
    const lit = idx === 0 ? 1 : p(t, ti - 0.02, ti + 0.2);
    return (1 - 0.7 * dimK * (1 - lit)) * rowFocus(t, r);
  };
  const n = Math.max(1, Math.min(45, Math.floor((t - SWEEP_A) / STEP) + 1));
  const ringsOut = 1 - p(t, ...PANEL_OUT);
  // the printed „1 Hz” label under the first circle (image coords ≈ 114, 226)
  const lab = { x: G.ox + 114 * G.s, y: G.oy + 232 * G.s };
  // axis arrow (slow → fast) travels down and lands on „jos”
  const kArrow = p(t, W.jos - 0.75, W.jos + 0.05), kHead = p(t, W.jos - 0.05, W.jos + 0.2);
  const ySlow = mix(372, ROW_Y[0], p(t, W.sus, W.sus + 0.55));
  const yFast = mix(502, ROW_Y[4], p(t, W.jos, W.jos + 0.55));

  return (
    <Scene start={T0} end={T_LEG} tone="cream" enterMode="cut">
      {/* window with the real map + annotations (104 % → 100 %, fade 300 ms) */}
      <AbsoluteFill style={{ opacity: kWin, transform: `scale(${mix(1.04, 1, kWin)})`, transformOrigin: `${BOX.x + BOX.w / 2}px ${BOX.y + BOX.h / 2}px` }}>
        <MapImage name={MAP} box={BOX} view={VIEW} radius={B.r.card} reveal={reveal} />
        <div style={{ position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, borderRadius: B.r.card, border: `2px solid ${B.c.sageLine}`, boxSizing: 'border-box' }} />
        <div style={{ opacity: ringsOut }}>
          <Ring row={0} col={0} k={p(t, W.cerc - 0.05, W.cerc + 0.4)} />
          <Ring row={4} col={8} k={p(t, W.n45 - 0.05, W.n45 + 0.35)} />
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Draw d={`M${lab.x - 26} ${lab.y} L${lab.x + 26} ${lab.y}`} k={p(t, W.frec - 0.02, W.frec + 0.3)} color={B.c.navy} width={4} />
          </svg>
        </div>
        <RowBracket name={MAP} box={BOX} view={VIEW} r0={0} r1={0} k={p(t, W.sus, W.sus + 0.45)} />
        <RowBracket name={MAP} box={BOX} view={VIEW} r0={4} r1={4} k={p(t, W.jos, W.jos + 0.45)} />
      </AbsoluteFill>
      <Note style={{ position: 'absolute', left: BOX.x, top: 790, opacity: kWin }}>Hartă EEG reală · exemplu anonimizat</Note>

      {/* axis band: Hz ranges aligned on the rows + slow→fast arrow */}
      <div style={{ position: 'absolute', left: 612, width: 80, top: ROW_Y[0] - 62, textAlign: 'right', ...sans(24, 600, B.c.sage), ...enter(p(t, 23.95, 24.3), 'left', 12) }}>Hz</div>
      {RANGES.map((s, i) => {
        const k = p(t, 24.0 + i * 0.08, 24.35 + i * 0.08);
        return (
          <div key={s} style={{ position: 'absolute', left: 612, width: 80, top: ROW_Y[i] - 15, textAlign: 'right', whiteSpace: 'nowrap', ...sans(24, 600, B.c.navy), ...enter(k, 'left', 12), opacity: k * rowFocus(t, i) }}>{s}</div>
        );
      })}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Draw d={`M600 ${ROW_Y[0] - 30} L600 ${ROW_Y[4] + 40}`} k={kArrow} color={B.c.goldDark} width={4} />
        <Draw d={`M588 ${ROW_Y[4] + 27} L600 ${ROW_Y[4] + 40} L612 ${ROW_Y[4] + 27}`} k={kHead} color={B.c.goldDark} width={4} />
      </svg>

      {/* left panel — part 1: title, „1 cerc = 1 frecvență”, counter 1 → 45 Hz */}
      <div style={{ position: 'absolute', left: 96, top: 120, width: 480, opacity: outIntro }}>
        <div style={enter(kPanel, 'left')}>
          <GoldBar />
          <Label style={{ marginTop: 16 }}>01</Label>
          <Title size={52} style={{ marginTop: 14 }}>Cum se citește<br />harta</Title>
        </div>
        <div style={{ position: 'absolute', top: 222, height: 68, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          <div style={{ position: 'relative', width: 68, height: 68, marginRight: 8, ...enter(p(t, W.cerc - 0.05, W.cerc + 0.35), 'right') }}>
            <CircleSample name={MAP} row={0} col={0} x={0} y={0} d={68} />
          </div>
          <div style={{ ...sans(36), ...enter(p(t, W.cerc, W.cerc + 0.35), 'up', 16) }}>1 cerc</div>
          <div style={{ ...sans(36), ...enter(p(t, W.frec - 0.05, W.frec + 0.3), 'up', 16) }}>= 1 frecvență</div>
        </div>
        <div style={{ position: 'absolute', top: 318, display: 'flex', alignItems: 'baseline', gap: 16, ...sans(34), ...enter(p(t, SWEEP_A - 0.12, SWEEP_A + 0.2), 'up', 16) }}>
          <span>De la</span>
          <span style={numStyle}>1</span>
          <span>la</span>
          <span style={{ ...numStyle, display: 'inline-block', width: 96 }}>{n}</span>
          <span>Hz</span>
        </div>
      </div>

      {/* left panel — part 2: compact chapter label + waves */}
      <div style={{ position: 'absolute', left: 96, top: 60, display: 'flex', alignItems: 'center', gap: 16, ...enter(p(t, 24.6, 24.95), 'left') }}>
        <GoldBar />
        <Label>01 · Cum se citește harta</Label>
      </div>
      <WaveBlock t={t} y={ySlow} cycles={1.5} speed={0.25} name="Unde lente" tag="Sus"
        k={p(t, W.lente - 0.12, W.lente + 0.25)} kDraw={p(t, W.lente - 0.12, W.lente + 0.45)} kTag={p(t, W.sus + 0.15, W.sus + 0.5)} />
      <WaveBlock t={t} y={yFast} cycles={6} speed={0.6} name="Unde rapide" tag="Jos"
        k={p(t, W.rapide - 0.12, W.rapide + 0.25)} kDraw={p(t, W.rapide - 0.12, W.rapide + 0.45)} kTag={p(t, W.jos + 0.15, W.jos + 0.5)} />
      <Illustrative text="Unde: reprezentare ilustrativă" style={{ position: 'absolute', left: 96, width: 464, top: 794, textAlign: 'right', opacity: p(t, W.lente - 0.1, W.lente + 0.3) }} />
    </Scene>
  );
};

// ═════════════════════════════ B) LEGEND GAUGE → MINI LEGEND ═════════════════════════════
type Rect = { x: number; y: number; w: number; h: number };
const CARD: Rect = { x: 1224, y: 120, w: 600, h: 700 };
const MINI: Rect = { x: 1224, y: 748, w: 520, h: 72 };
const TRACK = { x0: 1264, x1: 1360, y0: 312, y1: 760, r: 48 };
const BAND = { y0: 470, y1: 600 };
const SX = (TRACK.x0 + TRACK.x1) / 2;
const ZY = { red: (TRACK.y0 + BAND.y0) / 2, green: (BAND.y0 + BAND.y1) / 2, blue: (BAND.y1 + TRACK.y1) / 2 };
const TX = 1392;                // text column x 1392–1784
const MORPH: [number, number] = [43.4, 43.8];

const ColorText: React.FC<{ y: number; k: number; dim: number; name: string; l1: string; l2: string }> = ({ y, k, dim, name, l1, l2 }) => (
  <div style={{ position: 'absolute', left: TX, top: y - 62, width: 392, height: 124, display: 'flex', flexDirection: 'column', justifyContent: 'center', ...enter(k, 'left', 16), opacity: k * dim }}>
    <div style={sans(36, 600, B.c.navy)}>{name}</div>
    <div style={{ ...sans(30, 400), marginTop: 4 }}>{l1}<br />{l2}</div>
  </div>
);

const Legend: React.FC = () => {
  const t = useT();
  if (t < T_LEG || t >= T_END) return null;
  const kIn = p(t, T_LEG, T_LEG + 0.35);
  const kM = p(t, ...MORPH);
  const cK = 1 - p(t, MORPH[0], MORPH[0] + 0.16);
  const mK = p(t, MORPH[0] + 0.22, MORPH[1]);
  const r: Rect = { x: mix(CARD.x, MINI.x, kM), y: mix(CARD.y, MINI.y, kM), w: mix(CARD.w, MINI.w, kM), h: mix(CARD.h, MINI.h, kM) };
  const back = p(t, 43.0, 43.3);  // everything back to 100 %
  const dimBlue = 1 - 0.4 * (p(t, 34.98, 35.28) - back);
  const dimRed = 1 - 0.4 * (p(t, 39.4, 39.7) - back);
  const { x0, x1, y0, y1, r: rr } = TRACK;
  const trackD = `M${x0 + rr} ${y0} H${x1 - rr} Q${x1} ${y0} ${x1} ${y0 + rr} V${y1 - rr} Q${x1} ${y1} ${x1 - rr} ${y1} H${x0 + rr} Q${x0} ${y1} ${x0} ${y1 - rr} V${y0 + rr} Q${x0} ${y0} ${x0 + rr} ${y0} Z`;
  const kTrack = p(t, T_LEG + 0.12, T_LEG + 0.7);
  const kBand = p(t, T_LEG + 0.35, T_LEG + 0.75);
  const D = mix(80, 40, kM);

  // real circle crops: blue (map 1, 9 Hz), red (map 2, 9 Hz), green (map 5, 4 Hz)
  const samples: Array<{ key: string; name: MapName; row: number; col: number; gy: number; mx: number; a: number; dim: number }> = [
    { key: 'blue', name: 'map1_alerta', row: 0, col: 8, gy: mix(ZY.green, ZY.blue, p(t, W.albastru, W.albastru + 0.45)), mx: 1244, a: p(t, W.albastru - 0.06, W.albastru + 0.12), dim: dimBlue },
    { key: 'green', name: 'map5_echilibru', row: 0, col: 3, gy: mix(ZY.green - 24, ZY.green, p(t, W.verde, W.verde + 0.4)), mx: 1372, a: p(t, W.verde - 0.04, W.verde + 0.25), dim: 1 },
    { key: 'red', name: 'map2_albastru', row: 0, col: 8, gy: mix(ZY.green, ZY.red, p(t, W.rosu, W.rosu + 0.45)), mx: 1480, a: p(t, W.rosu - 0.06, W.rosu + 0.12), dim: dimRed },
  ];
  const mini = (left: number, text: string, w: number, center = false) => (
    <div style={{ position: 'absolute', left, width: w, top: 769, textAlign: center ? 'center' : 'left', whiteSpace: 'nowrap', ...sans(24), lineHeight: '30px', opacity: mK }}>{text}</div>
  );

  return (
    <AbsoluteFill style={{ opacity: kIn, transform: `translateX(${(1 - kIn) * B.m.slide}px)` }}>
      <div style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: B.r.card, background: B.c.cream }} />
      <div style={{ opacity: cK }}>
        <GoldBar style={{ position: 'absolute', left: 1264, top: 160 }} />
        <Title size={48} style={{ position: 'absolute', left: 1264, top: 180 }}>Culorile hărții</Title>
        <Label style={{ position: 'absolute', left: 1264, top: 248, opacity: p(t, T_LEG + 0.2, T_LEG + 0.5) }}>Eșantioane din hărți reale</Label>
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
          <rect x={x0 + 2} y={BAND.y0} width={x1 - x0 - 4} height={BAND.y1 - BAND.y0} fill={B.c.sageLine} opacity={kBand} />
          <Draw d={`M${x1} ${BAND.y0} H1784`} k={kBand} color={B.c.sageLine} width={2} cap="butt" />
          <Draw d={`M${x1} ${BAND.y1} H1784`} k={kBand} color={B.c.sageLine} width={2} cap="butt" />
          <Draw d={trackD} k={kTrack} color={B.c.goldDark} width={3} />
        </svg>
        <Label style={{ position: 'absolute', left: TX, top: ZY.green - 30, lineHeight: '30px', opacity: p(t, T_LEG + 0.5, T_LEG + 0.85) * (1 - p(t, W.echilibru - 0.25, W.echilibru)) }}>Interval de<br />referință</Label>
        <ColorText y={ZY.blue} k={p(t, W.deficit - 0.05, W.deficit + 0.35)} dim={dimBlue} name="Albastru" l1="sub valorile" l2="de referință" />
        <ColorText y={ZY.red} k={p(t, W.exces - 0.05, W.exces + 0.35)} dim={dimRed} name="Roșu" l1="peste valorile" l2="de referință" />
        <ColorText y={ZY.green} k={p(t, W.echilibru - 0.05, W.echilibru + 0.35)} dim={1} name="Verde" l1="în intervalul" l2="de referință" />
        <Illustrative style={{ position: 'absolute', left: TX, width: 392, top: 774, textAlign: 'right', opacity: p(t, T_LEG + 0.3, T_LEG + 0.6) }} />
      </div>
      {samples.map((s) => {
        const cx = mix(SX, s.mx + 20, kM), cy = mix(s.gy, MINI.y + MINI.h / 2, kM);
        return <CircleSample key={s.key} name={s.name} row={s.row} col={s.col} x={cx - D / 2} y={cy - D / 2} d={D} style={{ opacity: s.a * s.dim }} />;
      })}
      {mini(1294, 'sub', 48)}{mini(1342, '·', 30, true)}{mini(1422, 'în', 28)}{mini(1450, '·', 30, true)}{mini(1530, 'peste referință', 200)}
    </AbsoluteFill>
  );
};

const Ch01: React.FC = () => (
  <>
    <Lesson />
    <Legend />
  </>
);
export default Ch01;
