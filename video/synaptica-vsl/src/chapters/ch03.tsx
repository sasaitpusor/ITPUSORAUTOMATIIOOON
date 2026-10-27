// Chapter 03 — „Cele 5 unde” · output 104.4–125.5 s · beats B29–B32.
// One continuous WaveRow (5 cards side by side, slow → fast) that changes shape with the edit:
//  MINI   104.4–106.15  cream PanelCard on the right (FRONTAL): „5 tipuri de unde”, 5 small waves draw on „5”.
//  → FS1  106.15–106.5  the card expands to a NAVY full-screen scene (covers the join at 106.5).
//  FS1    106.5–112.667 Delta / Teta light up on their words, role on the role word; „mai lente → mai rapide”.
//  → PANEL 112.667–113.117 on the cut to LATERAL the scene retreats into a navy panel over the monitor (face stays free).
//  PANEL  113.1–122.333 Alfa / Beta / Gama light up; active role as caption under the cards.
//  → FS2  122.333–122.633 the panel expands again (covers the camera pan) → „Nicio undă nu e bună sau rea · Fiecare are rolul ei”.
// The waves are NOT the map rows: horizontal cards, never aligned with the map grid. Every state carries „Reprezentare ilustrativă”.
import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { B } from '../brand';
import { enter, mix, mixColor, p, useT } from '../lib';
import { Draw, GoldBar, Illustrative, Label } from '../ui/kit';
import { BANDS, WaveGlyph } from '../ui/media';
import subs from '../data/subs_out.json';

export const NAVY: Array<[number, number]> = [[106.5, 112.667], [122.42, 125.5]];
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
const T0 = 104.4, T_END = 125.5;
const M1: [number, number] = [106.15, 106.5];     // mini card → full screen, complete on the join (frame 3195)
const M2: [number, number] = [112.667, 113.117];  // full screen → panel, starts on the first LATERAL frame (3380)
const M3: [number, number] = [122.333, 122.633];  // panel → full screen, done before the camera pan (~122.63)
const WD = {
  creierul: wt('creierul', 104.55), five: wt('5', 105.56), unde: wt('unde', 105.88),
  profund: 108.9, exista: wt('există', 123.05), frecventa: wt('frecvență', 124.09),
};
// band i lights on its name, its role appears on the role word
const ON = [wt('delta', 106.65), wt('teta', 109.95), wt('alfa', 112.83), wt('beta', 115.65), wt('gama', 120.37)];
const ROLE_AT = [wt('somnului', 108.17), wt('relaxarea', 111.27), wt('calmitate', 114.23), wt('gândire', 117.83), wt('integrarea', 121.31)];
const SPEED = [0.22, 0.34, 0.5, 0.8, 1.2];        // phase speed (cycles/s): slow → fast
const AMP = [0.42, 0.37, 0.32, 0.26, 0.21];       // each wave keeps its own amplitude (never equal)

const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// ─── layout states ─────────────────────────────────────────────────────────
type R = { x: number; y: number; w: number; h: number; r: number; rr?: number };   // rr = right-corner radius (defaults to r)
type St = {
  box: R; navy: number; card: (i: number) => R;
  name: number; nameSize: number; nameX: number; nameY: number;
  icon: number; iconS: number; iconX: number; iconY: number;
  role: number; waveW: number; waveH: number; waveCY: number; cyc: readonly number[]; stroke: number;
  illuX: number; illuY: number; arrowY: number;
};
const MINI: St = {
  box: { x: 1224, y: 160, w: 600, h: 560, r: 24 }, navy: 0, card: (i) => ({ x: 1264 + i * 107, y: 296, w: 92, h: 240, r: 12 }),
  name: 0, nameSize: 48, nameX: 26, nameY: 20, icon: 0, iconS: 56, iconX: 226, iconY: 28,
  role: 0, waveW: 68, waveH: 120, waveCY: 120, cyc: [0.75, 1.25, 2, 3, 4.5], stroke: 3,
  illuX: 1792, illuY: 672, arrowY: 560,
};
const FS1: St = {
  box: { x: 0, y: 0, w: 1920, h: 1080, r: 0 }, navy: 1, card: (i) => ({ x: 136 + i * 334, y: 268, w: 312, h: 400, r: 24 }),
  name: 1, nameSize: 48, nameX: 26, nameY: 20, icon: 1, iconS: 56, iconX: 226, iconY: 28,
  role: 1, waveW: 256, waveH: 120, waveCY: 190, cyc: [1.5, 2.5, 4, 6.5, 10], stroke: 4,
  illuX: 1824, illuY: 800, arrowY: 704,
};
// The panel bleeds off the right edge (x 960–1920, y 40–784) so the whole monitor is hidden — map edge, UI bar and the
// system watermark at x > 1824 included; her face stays at x < 700. Content keeps to x 1024–1808.
const PX = 1024;
const PANEL: St = {
  box: { x: 960, y: 40, w: 960, h: 744, r: 24, rr: 0 }, navy: 1, card: (i) => ({ x: PX + i * 160, y: 206, w: 144, h: 320, r: 16 }),
  name: 1, nameSize: 32, nameX: 16, nameY: 14, icon: 1, iconS: 44, iconX: 16, iconY: 66,
  role: 0, waveW: 112, waveH: 96, waveCY: 222, cyc: [1, 1.75, 2.75, 4.25, 6], stroke: 3,
  illuX: 1808, illuY: 744, arrowY: 558,
};
const FS2: St = { ...FS1, card: (i) => ({ x: 136 + i * 334, y: 150, w: 312, h: 400, r: 24 }), arrowY: 584 };

const mixR = (a: R, b: R, k: number): R => ({ x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), w: mix(a.w, b.w, k), h: mix(a.h, b.h, k), r: mix(a.r, b.r, k), rr: mix(a.rr ?? a.r, b.rr ?? b.r, k) });
const NK0: [number, number] = [105.98, 106.22];  // the mini card turns navy in place, just before it expands
const phase = (t: number): { a: St; b: St; k: number; nk: number } => {
  if (t < M1[1]) return { a: MINI, b: FS1, k: p(t, M1[0], M1[1], inOut), nk: p(t, NK0[0], NK0[1]) };
  if (t < M2[0]) return { a: FS1, b: FS1, k: 0, nk: 1 };
  if (t < M3[0]) return { a: FS1, b: PANEL, k: p(t, M2[0], M2[1]), nk: 1 };
  return { a: PANEL, b: FS2, k: p(t, M3[0], M3[1]), nk: 1 };   // ease-out: the subtitle band is covered by ~122.4
};
const rgba = (k: number, a: number[], b: number[]) => `rgba(${[0, 1, 2].map((j) => Math.round(mix(a[j], b[j], k))).join(',')},${mix(a[3], b[3], k).toFixed(3)})`;
const SAGE40 = [78, 110, 96, 0.4], GOLD = [205, 179, 96, 1];

/** 0..1 — how lit band i is (one at a time; Gama stays lit; all five on „există”). */
const act = (t: number, i: number) => {
  const on = p(t, ON[i] - 0.05, ON[i] + 0.3);
  const off = i < 4 ? 1 - p(t, ON[i + 1] - 0.05, ON[i + 1] + 0.3) : 1;
  const all = p(t, WD.exista + i * 0.05, WD.exista + i * 0.05 + 0.35);
  return Math.max(Math.min(on, off), all);
};

// ─── line icons (56 × 56 box): Delta moon · Teta leaf · Alfa ripples · Beta target · Gama loose network ───
const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ICONS: string[][] = [
  ['M23.8 10.1 A20 20 0 1 0 44.9 36.5 A17 17 0 0 1 23.8 10.1 Z'],
  ['M11 45 C11 25 25 12 46 10 C46 31 32 45 11 45 Z', 'M11 45 L33 23'],
  [ring(28, 28, 4), ring(28, 28, 13), ring(28, 28, 22)],
  [ring(28, 28, 18), ring(28, 28, 7), 'M28 3 V13 M28 43 V53 M3 28 H13 M43 28 H53'],
  ['M9 41 L21 15 L35 31 L47 11 M35 31 L46 46 M21 15 L47 11', ring(9, 41, 3.2), ring(21, 15, 3.2), ring(35, 31, 3.2), ring(47, 11, 3.2), ring(46, 46, 3.2)],
];
const Icon: React.FC<{ i: number; k: number; s: number; color: string }> = ({ i, k, s, color }) => (
  <svg width={s} height={s} viewBox="0 0 56 56" style={{ display: 'block', overflow: 'visible' }}>
    {ICONS[i].map((d, j) => <Draw key={j} d={d} k={p(k, j * 0.12, Math.min(1, 0.55 + j * 0.12))} color={color} width={3} />)}
  </svg>
);

const sans = (size: number, color: string, weight: 400 | 600 = 600): React.CSSProperties =>
  ({ fontFamily: B.f.sans, fontWeight: weight, fontSize: size, lineHeight: 1.25, color });
const serif = (size: number, color: string): React.CSSProperties =>
  ({ fontFamily: B.f.serif, fontVariationSettings: size >= 56 ? B.f.serifDisplay : B.f.serifText, fontWeight: 400, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.01em', color });

// ─── one wave card (geometry + detail blended between two states) ─────────
const WaveCard: React.FC<{ i: number; t: number; a: St; b: St; k: number; nk: number }> = ({ i, t, a, b, k, nk }) => {
  const r = mixR(a.card(i), b.card(i), k);
  const v = (f: 'name' | 'nameSize' | 'nameX' | 'nameY' | 'icon' | 'iconS' | 'iconX' | 'iconY' | 'role' | 'waveW' | 'waveH' | 'waveCY' | 'stroke') => mix(a[f], b[f], k);
  const lit = act(t, i) * nk;
  const kc = p(t, 104.72 + i * 0.06, 105.05 + i * 0.06);                  // mini outlines appear
  const kDraw = p(t, WD.five - 0.04 + i * 0.12, WD.five + 0.36 + i * 0.12); // waves draw L→R on „5”
  const kIcon = p(t, ON[i], ON[i] + 0.6);
  const kRole = p(t, ROLE_AT[i] - 0.05, ROLE_AT[i] + 0.35);
  const op = mix(1, 0.4 + 0.6 * act(t, i), nk) * kc;
  const ww = v('waveW'), wh = v('waveH');
  const waveColor = mixColor(nk, B.c.goldDark, B.c.gold);
  // detail levels: leave fast when shrinking, arrive late when growing (so text never squeezes into a narrow card)
  const lvl = (f: 'name' | 'role' | 'icon') => (a[f] > b[f] ? p(mix(a[f], b[f], k), 0.65, 1) : p(mix(a[f], b[f], k), 0.5, 1));
  const name = lvl('name'), role = lvl('role') * kRole, icon = lvl('icon');
  return (
    <div style={{ position: 'absolute', left: r.x, top: r.y - 8 * lit, width: r.w, height: r.h, borderRadius: r.r, boxSizing: 'border-box',
      border: `${2 + lit}px solid ${rgba(nk, SAGE40, GOLD)}`, background: `rgba(205,179,96,${(0.07 * lit).toFixed(3)})`, opacity: op }}>
      {name > 0.01 && (
        <div style={{ position: 'absolute', left: v('nameX'), top: v('nameY'), ...serif(v('nameSize'), B.c.cream), opacity: name, whiteSpace: 'nowrap' }}>{BANDS[i].name}</div>
      )}
      {icon > 0.01 && (
        <div style={{ position: 'absolute', left: v('iconX'), top: v('iconY'), opacity: icon }}>
          <Icon i={i} k={kIcon} s={v('iconS')} color={B.c.gold} />
        </div>
      )}
      <div style={{ position: 'absolute', left: (r.w - ww) / 2 - 1, top: v('waveCY') - wh / 2 }}>
        <WaveGlyph w={ww} h={wh} cycles={mix(a.cyc[i], b.cyc[i], k)} amp={AMP[i] * (0.88 + 0.12 * lit)} t={t} speed={SPEED[i]} k={kDraw} color={waveColor} width={v('stroke')} />
      </div>
      {role > 0.01 && (
        <div style={{ position: 'absolute', left: 26, right: 16, bottom: 24, ...sans(30, B.c.cream), ...enter(role, 'up', 16) }}>{BANDS[i].role}</div>
      )}
    </div>
  );
};

/** „mai lente → mai rapide” — thin gold arrow under the row (never vertical, never an axis). */
const SlowFast: React.FC<{ x0: number; x1: number; y: number; k: number; vis: number }> = ({ x0, x1, y, k, vis }) => {
  if (vis <= 0.01) return null;
  const lw = x1 - x0 - 300;
  return (
    <div style={{ position: 'absolute', left: x0, width: x1 - x0, top: y, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: vis }}>
      <div style={{ ...sans(24, B.c.gold), whiteSpace: 'nowrap', opacity: p(k, 0, 0.3) }}>mai lente</div>
      <svg width={lw} height={20} style={{ display: 'block', overflow: 'visible' }}>
        <Draw d={`M0 10 L${lw} 10`} k={p(k, 0.05, 0.85)} color={B.c.gold} width={2} />
        <Draw d={`M${lw - 11} 2 L${lw} 10 L${lw - 11} 18`} k={p(k, 0.8, 1)} color={B.c.gold} width={2} />
      </svg>
      <div style={{ ...sans(24, B.c.gold), whiteSpace: 'nowrap', opacity: p(k, 0.75, 1) }}>mai rapide</div>
    </div>
  );
};

const Waves: React.FC = () => {
  const t = useT();
  if (t < T0 || t >= T_END) return null;
  const { a, b, k, nk } = phase(t);
  const box = mixR(a.box, b.box, k);
  const kIn = p(t, WD.creierul - 0.1, WD.creierul + 0.3);
  const groupStyle = t < M1[0] ? enter(kIn, 'right') : {};

  // texts per state
  const miniVis = 1 - p(t, M1[0] + 0.05, M1[0] + 0.2);
  const fs1Head = p(t, M1[1] - 0.06, M1[1] + 0.3) * (1 - p(t, M2[0], M2[0] + 0.15));
  const panelHead = p(t, M2[1] - 0.1, M2[1] + 0.25) * (1 - p(t, M3[0], M3[0] + 0.15));
  const c0 = mixR(a.card(0), b.card(0), k), c4 = mixR(a.card(4), b.card(4), k);
  const arrowVis = (t < M1[1] ? 0 : 1) * (1 - p(t, M3[0], M3[0] + 0.15));
  const kArrow = p(t, WD.profund, WD.profund + 0.7);
  const illuX = mix(a.illuX, b.illuX, k), illuY = mix(a.illuY, b.illuY, k);
  const msg1 = p(t, WD.exista - 0.05, WD.exista + 0.35), msg2 = p(t, WD.frecventa - 0.05, WD.frecventa + 0.35);

  return (
    <AbsoluteFill style={groupStyle}>
      {/* container: cream card → navy full screen → navy panel → navy full screen */}
      <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: `${box.r}px ${box.rr}px ${box.rr}px ${box.r}px`, background: mixColor(nk, B.c.cream, B.c.navy) }} />

      {/* MINI card text */}
      {miniVis > 0.01 && (
        <div style={{ opacity: miniVis }}>
          <GoldBar style={{ position: 'absolute', left: 1260, top: 196 }} />
          <div style={{ position: 'absolute', left: 1260, top: 218, ...serif(B.t.cardTitle, mixColor(nk, B.c.navy, B.c.cream)) }}>5 tipuri de unde</div>
          <div style={{ position: 'absolute', left: 1260, top: 566, ...sans(30, mixColor(nk, B.c.charcoal, B.c.cream)), ...enter(p(t, WD.unde - 0.05, WD.unde + 0.3), 'up', 16) }}>Fiecare undă are rolul ei</div>
        </div>
      )}

      {/* FS1 header */}
      {fs1Head > 0.01 && (
        <div style={{ position: 'absolute', left: 0, width: 1920, top: 122, textAlign: 'center', ...enter(fs1Head, 'up', 16) }}>
          <div style={serif(52, B.c.cream)}>5 tipuri de unde</div>
          <div style={{ ...sans(30, B.c.cream), marginTop: 14 }}>Fiecare undă are rolul ei</div>
        </div>
      )}

      {/* PANEL header */}
      {panelHead > 0.01 && (
        <div style={{ position: 'absolute', left: PX, top: 120, ...enter(panelHead, 'up', 12) }}>
          <GoldBar />
          <Label tone="navy" style={{ marginTop: 14 }}>5 tipuri de unde</Label>
        </div>
      )}

      {/* the five cards */}
      {BANDS.map((_, i) => <WaveCard key={i} i={i} t={t} a={a} b={b} k={k} nk={nk} />)}

      <SlowFast x0={c0.x} x1={c4.x + c4.w} y={mix(a.arrowY, b.arrowY, k)} k={kArrow} vis={arrowVis} />

      {/* PANEL caption: the active wave and its role */}
      {[2, 3, 4].map((i) => {
        const s = Math.max(ON[i], M2[1] - 0.15);
        const vis = p(t, s - 0.05, s + 0.3) * (i < 4 ? 1 - p(t, ON[i + 1] - 0.3, ON[i + 1] - 0.05) : 1) * (1 - p(t, M3[0], M3[0] + 0.15));
        if (vis <= 0.01) return null;
        const kr = p(t, ROLE_AT[i] - 0.05, ROLE_AT[i] + 0.35);
        return (
          <div key={i} style={{ position: 'absolute', left: PX, top: 614, width: 784, display: 'flex', alignItems: 'baseline', gap: 14, whiteSpace: 'nowrap', ...enter(vis, 'up', 12) }}>
            <span style={serif(48, B.c.gold)}>{BANDS[i].name}</span>
            <span style={{ ...sans(36, B.c.cream), ...enter(kr, 'left', 16) }}>· {BANDS[i].role}</span>
          </div>
        );
      })}

      {/* FS2 message */}
      {t >= M3[0] && (
        <div style={{ position: 'absolute', left: 0, width: 1920, top: 616, textAlign: 'center' }}>
          <div style={{ ...serif(60, B.c.cream), letterSpacing: '0.005em', ...enter(msg1, 'up', 16) }}>Nicio undă nu e bună sau rea</div>
          <div style={{ ...serif(48, B.c.gold), marginTop: 18, ...enter(msg2, 'up', 16) }}>Fiecare are rolul ei</div>
        </div>
      )}

      <Illustrative tone="navy" style={{ position: 'absolute', right: 1920 - illuX, top: illuY, color: mixColor(nk, B.c.charcoal, B.c.cream), whiteSpace: 'nowrap', opacity: t < M1[0] ? kIn : 1 }} />
    </AbsoluteFill>
  );
};

const Ch: React.FC = () => <Waves />;
export default Ch;
