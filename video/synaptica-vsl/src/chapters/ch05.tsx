// Chapter 05 — „Două variante” · output 144.967–172.853 s · beats B41–B46.
// ONE cream card on the right (x 1264–1824, never closer than ~109 px to her face, also in the 110 % shot at 152.5)
// that stays on screen for the whole range and changes its content on each jump cut:
//  S1 FlowFork   144.967–152.5   node „Harta ta · evaluare EEG” draws on „harta”; its bottom grid row lights on „frecvență”;
//                                the line comes down and forks on „două” → „A · Terapia cu casca” / „B · Neurofeedback”;
//                                on „ajuta” a gold dot runs from the map node into both options.
//  S2 Option A   152.5–158.303   the A row glides up into the title („Prima variantă”) · „Protocol personalizat”
//                                on „personalizat” · „pornind de la harta ta EEG” on „țintit”. Mini fork top-right: A.
//  S3 Map→setări 158.303–164.503 real map thumbnail (bottom row highlighted, „Exemplu anonimizat”) ↓ „Setări personalizate”:
//                                3 unlabeled sliders settle on „setat”; the row is outlined once on „identificăm”.
//  S4 Option B   164.503–167.503 „A doua variantă” · „B · Neurofeedback” · note · „antrenament cerebral / non-invaziv”.
//  S5 Sală       167.503–172.853 two columns: dumbbell draws on „sală” (2 slow reps on „antrenezi corpul”) │
//                                loose path-network draws on „vii la clinica”, a dot runs it twice („repetiție”) on „antrenăm”.
//                                „Nu înlocuiește consultul medical.” stays at the card base from 165.3 to the end.
import React from 'react';
import { Easing } from 'remotion';
import { B } from '../brand';
import { enter, mix, mixColor, p, useT } from '../lib';
import { Draw, GoldBar, Illustrative, Label, Note } from '../ui/kit';
import { Box, MapImage, RowOutline } from '../ui/maps';
import subs from '../data/subs_out.json';

export const NAVY: Array<[number, number]> = [];
export const HIDE_SUBS: Array<[number, number]> = [];

// ─── timing (output seconds), synced to the spoken words ───────────────────
const WORDS = (subs as { words: { t: string; s: number }[] }).words;
const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:„”"…–—]/g, '').trim();
/** Onset of word `w` closest to `near` (falls back to `near`). */
const wt = (w: string, near: number) => {
  let best = near, d = 1.2;
  for (const x of WORDS) { const dd = Math.abs(x.s - near); if (norm(x.t) === w && dd < d) { d = dd; best = x.s; } }
  return best;
};
const T0 = 144.967, T1 = 172.853;
const C1 = 152.5, C2 = 158.303, C3 = 164.503, C4 = 167.503;   // jump cuts (camera changes) = content changes
const WD = {
  harta: wt('harta', 145.83), frecventa: wt('frecvență', 147.49), avem: wt('avem', 148.85), doua: wt('două', 149.05),
  ajuta: wt('ajuta', 150.65),
  prima: wt('prima', 152.68), varianta: wt('variantă', 152.85), personalizat: wt('personalizat', 155.55), tintit: wt('țintit', 156.71),
  protocolul: wt('protocolul', 158.45), personalizat2: wt('personalizat', 158.83), setat: wt('setat', 160.05), identificam: wt('identificăm', 162.41),
  iar: wt('iar', 164.65), doua2: wt('doua', 164.85), neuro: wt('neurofeedback', 166.58),
  sala: wt('sală', 168.11), antrenezi: wt('antrenezi', 168.8), vii: wt('vii', 169.69), synaptica: wt('synaptica', 171.13), antrenam: wt('antrenăm', 171.9),
};
const NOTE_IN = 165.3;   // compliance note on the B card (plan: just after the cut), stays to the end

const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const C = B.c;

// ─── card geometry (screen px) ─────────────────────────────────────────────
const X = 1264, Y = 160, W = 560, PAD = 36, IN_R = W - PAD;            // content spans local x 36…524
// card height keyframes: the card grows when the line goes down / new rows arrive, and folds around the chosen option
const H0 = 186;
const HK: Array<[number, number]> = [
  [WD.avem - 0.35, 416],            // S1: the line comes down and forks
  [C1, 190],                        // S2: only the A title
  [WD.personalizat - 0.45, 360],    // S2: protocol rows
  [C2, 572],                        // S3: map → settings
  [C3, 384],                        // S4 / S5 (note pinned to the base)
];
const cardH = (t: number) => HK.reduce((h, [at, v]) => mix(h, v, p(t, at, at + 0.45, inOut)), H0);
/** visibility of a content group living between two cuts: in just after `a`, out just before `b`. */
const vis = (t: number, a: number, b: number) => Math.min(p(t, a + 0.06, a + 0.4), 1 - p(t, b - 0.16, b + 0.02));

// ─── small geometry helpers ────────────────────────────────────────────────
type P2 = [number, number];
const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
const bez = (a: P2, b: P2, c: P2, d: P2, n = 24): P2[] => Array.from({ length: n + 1 }, (_, i) => {
  const u = i / n, v = 1 - u;
  return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]] as P2;
});
/** point at fraction u (0..1) of the polyline length */
const along = (pts: P2[], u: number): P2 => {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, d / seg[i]) : 0; return [mix(pts[i][0], pts[i + 1][0], k), mix(pts[i][1], pts[i + 1][1], k)]; }
    d -= seg[i];
  }
  return pts[pts.length - 1];
};

const serif = (size: number, color: string = C.navy): React.CSSProperties =>
  ({ fontFamily: B.f.serif, fontVariationSettings: size >= 56 ? B.f.serifDisplay : B.f.serifText, fontWeight: 400, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.01em', color, whiteSpace: 'nowrap' });
const sans = (size: number, weight: 400 | 600 = 600, color: string = C.charcoal): React.CSSProperties =>
  ({ fontFamily: B.f.sans, fontWeight: weight, fontSize: size, lineHeight: 1.25, color });
const abs = (x: number, y: number, extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left: x, top: y, ...extra });

// ─── line glyphs (all goldDark on cream, drawn with strokes) ───────────────
/** „harta” glyph: framed 3×5 grid of rings (72-px design box). `hi` fills the bottom row. */
const GridGlyph: React.FC<{ x: number; y: number; s?: number; k: number; hi?: number }> = ({ x, y, s = 72, k, hi = 0 }) => {
  const cells: Array<[number, number, number]> = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) cells.push([12 + c * 12, 24 + r * 12, r]);
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 72})`}>
      <Draw d={rrect(1.5, 1.5, 69, 69, 16)} k={p(k, 0, 0.55)} width={3} />
      {cells.map(([cx, cy, r], i) => (
        <g key={i}>
          {r === 2 && hi > 0 && <circle cx={cx} cy={cy} r={4.5} fill={C.goldDark} opacity={hi} />}
          <Draw d={ring(cx, cy, 4.5)} k={p(k, 0.3 + i * 0.03, 0.55 + i * 0.03)} width={2.5} />
        </g>
      ))}
    </g>
  );
};
/** „setări” glyph: framed 3 vertical sliders (72-px design box). */
const SliderGlyph: React.FC<{ x: number; y: number; s?: number; k: number }> = ({ x, y, s = 72, k }) => (
  <g transform={`translate(${x} ${y}) scale(${s / 72})`}>
    <Draw d={rrect(1.5, 1.5, 69, 69, 16)} k={p(k, 0, 0.55)} width={3} />
    {[[22, 30], [36, 46], [50, 26]].map(([cx, ky], i) => (
      <g key={i}>
        <Draw d={`M${cx} 16 V56`} k={p(k, 0.3 + i * 0.1, 0.65 + i * 0.1)} width={2.5} />
        {k > 0.6 + i * 0.1 && <circle cx={cx} cy={ky} r={5} fill={C.cream} stroke={C.goldDark} strokeWidth={2.5} opacity={p(k, 0.6 + i * 0.1, 0.8 + i * 0.1)} />}
      </g>
    ))}
  </g>
);
/** Dumbbell (120 × 72 design box). */
const DUMBBELL = [rrect(22, 10, 14, 52, 4), rrect(84, 10, 14, 52, 4), rrect(9, 21, 13, 30, 3.5), rrect(98, 21, 13, 30, 3.5), 'M36 36 H84'];
/** Loose, asymmetric path-network (NOT the logo's triangulated brain): an open chain + one side branch. */
const NET_NODES: P2[] = [[10, 54], [36, 20], [62, 44], [92, 14], [112, 46], [74, 68]];
const NET_CHAIN = [0, 1, 2, 3, 4];
const NET_PTS: P2[] = NET_CHAIN.map((i) => NET_NODES[i]);

/** Mini fork top-right of the card: which of the two variants we are on (0 = A, 1 = B). */
const ForkGlyph: React.FC<{ x: number; y: number; k: number; b: number }> = ({ x, y, k, b }) => {
  // active branch goldDark (filled dot) · inactive branch sage at 45 % (empty dot) — brand colours only
  const colA = mixColor(b, C.goldDark, C.sage), colB = mixColor(b, C.sage, C.goldDark);
  const opA = mix(1, 0.45, b), opB = mix(0.45, 1, b);
  return (
    <g transform={`translate(${x} ${y})`} opacity={k}>
      <path d="M0 28 H18" stroke={C.goldDark} strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d="M18 28 C28 28 28 10 40 10 H46" stroke={colA} strokeOpacity={opA} strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d="M18 28 C28 28 28 46 40 46 H46" stroke={colB} strokeOpacity={opB} strokeWidth={3} strokeLinecap="round" fill="none" />
      <circle cx={52} cy={10} r={5.5} fill={mixColor(b, C.goldDark, C.cream)} stroke={colA} strokeOpacity={opA} strokeWidth={2.5} />
      <circle cx={52} cy={46} r={5.5} fill={mixColor(b, C.cream, C.goldDark)} stroke={colB} strokeOpacity={opB} strokeWidth={2.5} />
      <text x={66} y={18.5} style={{ fontFamily: B.f.sans, fontWeight: 600, fontSize: 24 }} fill={mixColor(b, C.navy, C.sage)}>A</text>
      <text x={66} y={54.5} style={{ fontFamily: B.f.sans, fontWeight: 600, fontSize: 24 }} fill={mixColor(b, C.sage, C.navy)}>B</text>
    </g>
  );
};

// ─── S1 FlowFork geometry (card-local) ─────────────────────────────────────
const NODE = { x: 36, y: 66, s: 72 };
const STEM: P2[] = [[72, 138], [72, 196]];
const BR_A: P2[] = bez([72, 196], [72, 236], [92, 252], [129, 252]);
const BR_B: P2[] = [[72, 196], ...bez([72, 300], [72, 340], [92, 356], [129, 356])];
const ptsD = (pts: P2[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
const ROW_A = { dot: [136, 252] as P2, x: 160, y: 252 }, ROW_B = { dot: [136, 356] as P2, x: 160, y: 356 };
const TITLE = { x: 36, y: 96, size: 40 };          // S2/S4 title position

// ─── S3 geometry (card-local) ───────────────────────────────────────────────
const THUMB: Box = { x: 36, y: 62, w: 270, h: 182 };
const HI_ROW = 4;                                  // real map 1, row 37–45 Hz (visibly different) — no claim attached
const SL_Y = [384, 430, 476], SL_X0 = 50, SL_X1 = 510;
const SL_FROM = [0.5, 0.5, 0.5], SL_TO = [0.27, 0.68, 0.43];

const Ch: React.FC = () => {
  const t = useT();
  if (t < T0 || t >= T1) return null;
  const CARD_IN = WD.harta - 0.3;                                    // ch04's card has left by 144.966 → a fresh card, right as „harta” draws
  if (t < CARD_IN) return null;
  const kCard = Math.min(p(t, CARD_IN, CARD_IN + 0.38), 1 - p(t, T1 - 0.24, T1));
  const h = cardH(t);

  // S1 — fork
  const s1 = 1 - p(t, C1 - 0.06, C1 + 0.18);                       // everything of S1 except the A row
  const kNode = p(t, WD.harta - 0.1, WD.harta + 0.75);
  const kNodeTxt = p(t, WD.harta + 0.05, WD.harta + 0.45);
  const hiRow = p(t, WD.frecventa - 0.05, WD.frecventa + 0.3);
  const kStem = p(t, WD.avem - 0.3, WD.doua);
  const kBr = p(t, WD.doua - 0.02, WD.doua + 0.5);
  const kA = p(t, WD.doua + 0.3, WD.doua + 0.65), kB = p(t, WD.doua + 0.5, WD.doua + 0.85);
  const dotT = (t - WD.ajuta) / 1.0;                                // 0..1: dot travels node → split → both options
  // S1 → S2 morph of the A row into the title
  const km = p(t, C1, C1 + 0.5, inOut);
  const aSize = mix(36, TITLE.size, km);
  const aX = mix(ROW_A.x, TITLE.x, km), aY = mix(ROW_A.y - 0.55 * 36, TITLE.y, km);
  const aVis = Math.min(kA, 1 - p(t, C2 - 0.16, C2 + 0.02));

  // S2 — option A detail
  const s2 = vis(t, C1, C2);
  const kLabA = p(t, WD.prima - 0.05, WD.prima + 0.3);
  const kDivA = p(t, WD.personalizat - 0.35, WD.personalizat + 0.25);
  const kRow1 = p(t, WD.personalizat - 0.05, WD.personalizat + 0.35);
  const kRow2 = p(t, WD.tintit - 0.05, WD.tintit + 0.35);

  // S3 — map → settings
  const s3 = vis(t, C2, C3);
  const kThumb = p(t, C2 + 0.05, C2 + 0.45);
  const dim = p(t, C2 + 0.35, C2 + 0.75);
  const kArrow = p(t, WD.personalizat2 - 0.1, WD.personalizat2 + 0.4);
  const kSet = p(t, WD.personalizat2 + 0.1, WD.personalizat2 + 0.5);
  const kTracks = p(t, WD.personalizat2 + 0.15, WD.personalizat2 + 0.8);
  const kOutline = p(t, WD.identificam - 0.05, WD.identificam + 0.6);
  const arrowDot = (t - (WD.setat - 0.5)) / 0.5;                    // runs down the arrow right before „setat”
  const knob = (i: number) => mix(SL_FROM[i], SL_TO[i], p(t, WD.setat + i * 0.12, WD.setat + 0.65 + i * 0.12, inOut));

  // S4 — option B
  const s4 = vis(t, C3, C4);
  const kLabB = p(t, WD.iar - 0.05, WD.iar + 0.3);
  const kTitB = p(t, WD.doua2, WD.doua2 + 0.35);
  const kDivB = p(t, WD.neuro - 0.35, WD.neuro + 0.2);
  const kSubB = p(t, WD.neuro - 0.05, WD.neuro + 0.35);
  const kNote = p(t, NOTE_IN, NOTE_IN + 0.35);

  // S5 — gym comparison
  const s5 = p(t, C4 + 0.06, C4 + 0.4);
  const kDumb = p(t, WD.sala - 0.08, WD.sala + 0.7);
  const kCol1 = p(t, WD.sala, WD.sala + 0.35);
  const rep = Math.max(0, Math.min(1, (t - WD.antrenezi) / 1.3));   // 2 slow lifts
  const lift = rep > 0 && rep < 1 ? (0.5 - 0.5 * Math.cos(rep * Math.PI * 4)) * 10 : 0;
  const kVdiv = p(t, WD.vii - 0.3, WD.vii + 0.2);
  const kNet = (i: number) => p(t, WD.vii + i * 0.14, WD.vii + 0.3 + i * 0.14);
  const kCol2 = p(t, WD.vii + 0.1, WD.vii + 0.45);
  const pass = (a: number) => (t - a) / 0.7;
  const netDot = [pass(WD.synaptica + 0.05), pass(WD.antrenam)].find((u) => u >= 0 && u <= 1);

  // mini fork (S2–S5)
  const kFork = Math.min(p(t, C1 + 0.35, C1 + 0.75), 1 - p(t, C4 - 0.16, C4 + 0.02));   // A/B orientation, S2–S4 only
  const forkB = p(t, C3 + 0.05, C3 + 0.45);

  const S1 = s1 > 0.001, S2 = s2 > 0.001, S3 = s3 > 0.001, S4 = s4 > 0.001, S5 = s5 > 0.001;
  const DOT_R = 7;
  const dots: P2[] = [];
  if (dotT > 0 && dotT < 1.15 && S1) {
    if (dotT < 0.35) dots.push(along(STEM, dotT / 0.35));
    else { const u = Math.min(1, (dotT - 0.35) / 0.6); dots.push(along(BR_A, u), along(BR_B, u)); }
  }
  const dotFade = 1 - p(t, WD.ajuta + 0.95, WD.ajuta + 1.15);

  return (
    <div style={{ position: 'absolute', left: X, top: Y, width: W, height: h, borderRadius: B.r.card, background: C.cream, overflow: 'hidden', ...enter(kCard, 'right') }}>
      <GoldBar style={{ position: 'absolute', left: PAD, top: PAD }} />

      {/* ── all strokes ── */}
      <svg width={W} height={640} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {kFork > 0 && <ForkGlyph x={428} y={28} k={kFork} b={forkB} />}

        {S1 && (
          <g opacity={s1}>
            <GridGlyph x={NODE.x} y={NODE.y} s={NODE.s} k={kNode} hi={hiRow} />
            <Draw d={ptsD(STEM)} k={kStem} width={4} />
            <Draw d={ptsD(BR_A)} k={kBr} width={4} />
            <Draw d={ptsD(BR_B)} k={kBr} width={4} />
            {kBr > 0.85 && <circle cx={ROW_B.dot[0]} cy={ROW_B.dot[1]} r={DOT_R} fill={C.goldDark} opacity={p(kBr, 0.85, 1)} />}
            {dots.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={9} fill={C.gold} stroke={C.goldDark} strokeWidth={2} opacity={dotFade} />)}
          </g>
        )}
        {kBr > 0.85 && km < 1 && <circle cx={ROW_A.dot[0]} cy={ROW_A.dot[1]} r={DOT_R} fill={C.goldDark} opacity={p(kBr, 0.85, 1) * (1 - p(t, C1 - 0.06, C1 + 0.18))} />}

        {S2 && (
          <g opacity={s2}>
            <Draw d={`M${PAD} 168 H${IN_R}`} k={kDivA} color={C.sageLine} width={2} />
            <SliderGlyph x={PAD} y={192} s={56} k={p(t, WD.personalizat - 0.1, WD.personalizat + 0.7)} />
            <GridGlyph x={PAD} y={264} s={56} k={p(t, WD.tintit - 0.1, WD.tintit + 0.7)} hi={p(t, WD.tintit + 0.3, WD.tintit + 0.6)} />
          </g>
        )}

        {S3 && (
          <g opacity={s3}>
            {/* arrow: highlighted map → settings */}
            <Draw d="M171 258 V304" k={p(kArrow, 0, 0.7)} width={4} />
            <Draw d="M160 293 L171 304 L182 293" k={p(kArrow, 0.6, 1)} width={4} />
            {arrowDot > 0 && arrowDot < 1 && <circle cx={171} cy={mix(258, 300, arrowDot)} r={8} fill={C.gold} stroke={C.goldDark} strokeWidth={2} />}
            {/* sliders (no labels) */}
            {SL_Y.map((y, i) => {
              const kx = mix(SL_X0, SL_X1, knob(i));
              const kt = p(kTracks, i * 0.15, 0.7 + i * 0.15);
              return (
                <g key={i}>
                  <Draw d={`M${SL_X0} ${y} H${SL_X1}`} k={kt} color={C.sageLine} width={4} />
                  {kt > 0.3 && <path d={`M${SL_X0} ${y} H${kx}`} stroke={C.goldDark} strokeWidth={4} strokeLinecap="round" opacity={p(kt, 0.3, 0.8)} />}
                  {kt > 0.3 && <circle cx={kx} cy={y} r={14} fill={C.cream} stroke={C.goldDark} strokeWidth={3} opacity={p(kt, 0.3, 0.8)} />}
                </g>
              );
            })}
          </g>
        )}

        {S4 && (
          <g opacity={s4}>
            <Draw d={`M${PAD} 168 H${IN_R}`} k={kDivB} color={C.sageLine} width={2} />
          </g>
        )}

        {S5 && (
          <g opacity={s5}>
            <g transform={`translate(${PAD} ${58 - lift})`}>
              {DUMBBELL.map((d, i) => <Draw key={i} d={d} k={p(kDumb, i * 0.1, 0.55 + i * 0.1)} width={3} />)}
            </g>
            <Draw d="M266 62 V272" k={kVdiv} color={C.sageLine} width={2} />
            <g transform={`translate(296 58)`}>
              {NET_CHAIN.slice(1).map((n, i) => {
                const a = NET_NODES[NET_CHAIN[i]], b = NET_NODES[n];
                return <Draw key={i} d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} k={p(kNet(i), 0.2, 1)} width={3} />;
              })}
              <Draw d={`M${NET_NODES[2][0]} ${NET_NODES[2][1]} L${NET_NODES[5][0]} ${NET_NODES[5][1]}`} k={p(kNet(4), 0.2, 1)} width={3} />
              {NET_NODES.map((q, i) => {
                const kk = kNet(i === 5 ? 4.5 : i);
                return kk > 0 ? <circle key={i} cx={q[0]} cy={q[1]} r={7} fill={C.cream} stroke={C.goldDark} strokeWidth={3} opacity={p(kk, 0, 0.5)} /> : null;
              })}
              {netDot !== undefined && (() => { const q = along(NET_PTS, inOut(netDot)); return <circle cx={q[0]} cy={q[1]} r={8} fill={C.gold} stroke={C.goldDark} strokeWidth={2} />; })()}
            </g>
          </g>
        )}
      </svg>

      {/* ── S1 texts ── */}
      {S1 && (
        <div style={{ opacity: s1 }}>
          <div style={abs(132, 64, { ...enter(kNodeTxt, 'up', 12) })}>
            <div style={serif(44)}>Harta ta</div>
            <Label style={{ marginTop: 8 }}>evaluare EEG</Label>
          </div>
          <div style={abs(ROW_B.x, ROW_B.y - 0.55 * 36, { ...serif(36), ...enter(kB, 'left', 12) })}>
            <span style={{ color: C.goldDark }}>B · </span>Neurofeedback
          </div>
        </div>
      )}
      {/* A row → S2 title (one element, glides on the cut) */}
      {aVis > 0.001 && (
        <div style={abs(aX, aY, { ...serif(aSize), ...enter(kA, 'left', 12), opacity: aVis })}>
          <span style={{ color: C.goldDark }}>A · </span>Terapia cu casca
        </div>
      )}

      {/* ── S2 texts ── */}
      {S2 && (
        <div style={{ opacity: s2 }}>
          <Label style={abs(PAD, 54, { ...enter(kLabA, 'up', 10) })}>Prima variantă</Label>
          <div style={abs(112, 192, { height: 56, display: 'flex', alignItems: 'center', ...sans(34), ...enter(kRow1, 'up', 12) })}>Protocol personalizat</div>
          <div style={abs(112, 264, { height: 56, display: 'flex', alignItems: 'center', ...sans(30, 400), ...enter(kRow2, 'up', 12) })}>pornind de la harta ta EEG</div>
        </div>
      )}

      {/* ── S3: real map thumbnail + captions ── */}
      {S3 && (
        <div style={{ opacity: s3 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: kThumb, transform: `translateY(${(1 - kThumb) * 12}px)` }}>
            <MapImage name="map1_alerta" box={THUMB} radius={14} bg={C.cream} reveal={(r) => (r === HI_ROW ? 1 : mix(1, 0.38, dim))} />
            <RowOutline name="map1_alerta" box={THUMB} r0={HI_ROW} r1={HI_ROW} k={kOutline} />
          </div>
          <div style={abs(330, 98, { ...enter(kThumb, 'up', 12) })}>
            <div style={serif(40)}>Harta ta</div>
            <div style={{ ...sans(24, 400), marginTop: 10, width: 190 }}>Exemplu anonimizat</div>
          </div>
          <div style={abs(PAD, 314, { ...serif(40), ...enter(kSet, 'up', 12) })}>Setări personalizate</div>
          <Illustrative style={abs(0, 516, { width: IN_R, textAlign: 'right', opacity: kSet })} />
        </div>
      )}

      {/* ── S4 texts ── */}
      {S4 && (
        <div style={{ opacity: s4 }}>
          <Label style={abs(PAD, 54, { ...enter(kLabB, 'up', 10) })}>A doua variantă</Label>
          <div style={abs(TITLE.x, TITLE.y, { ...serif(TITLE.size), ...enter(kTitB, 'up', 12) })}>
            <span style={{ color: C.goldDark }}>B · </span>Neurofeedback
          </div>
          <div style={abs(PAD, 194, { ...sans(34), ...enter(kSubB, 'up', 12) })}>antrenament cerebral<br />non-invaziv</div>
        </div>
      )}

      {/* ── S5 texts ── */}
      {S5 && (
        <div style={{ opacity: s5 }}>
          <div style={abs(PAD, 148, { width: 222, ...enter(kCol1, 'up', 12) })}>
            <div style={serif(40)}>Corpul:</div>
            <div style={{ ...sans(30), marginTop: 8 }}>antrenament<br />la sală</div>
          </div>
          <div style={abs(296, 148, { width: 228, ...enter(kCol2, 'up', 12) })}>
            <div style={serif(40)}>Creierul:</div>
            <div style={{ ...sans(30), marginTop: 8 }}>antrenament<br />prin repetiție</div>
          </div>
        </div>
      )}

      {/* ── compliance note: B card → end, pinned to the card base ── */}
      {t >= NOTE_IN && (
        <Note style={abs(PAD, h - PAD - 39, { width: W - 2 * PAD + 8, whiteSpace: 'nowrap', ...enter(kNote, 'up', 10) })}>Nu înlocuiește consultul medical.</Note>
      )}
    </div>
  );
};
export default Ch;
