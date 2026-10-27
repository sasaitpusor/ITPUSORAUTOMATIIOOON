import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill, Composition, Easing, Img, OffthreadVideo, continueRender, delayRender,
  interpolate, registerRoot, staticFile, useCurrentFrame,
} from 'remotion';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import {PHRASES, Word} from './words';

// ─── Synaptica brand tokens (Manual de brand v1, oct. 2026) ────────────────
const B = {
  c: {
    navy: '#0E1D33', gold: '#CDB360', goldDark: '#9F8A3F', cream: '#FAF7F1',
    sage: '#4E6E60', terracotta: '#C1633B', charcoal: '#3B3631', white: '#FFFFFF',
    subBg: 'rgba(14,29,51,0.72)',
  },
  f: {
    serif: "'Fraunces Variable', serif",
    sans: "'Inter', sans-serif",
    serifDisplay: '"opsz" 144, "SOFT" 0, "WONK" 0',
    serifText: '"SOFT" 0, "WONK" 0',
  },
  r: {card: 24, pill: 32, sub: 12},
  x: {left: 64, right: 1016, rightBtnZone: 944},
  y: {top: 192, card: 920, subBottom: 1568},
  fps: 30,
  dur: {in: 12, out: 9},
  slide: 24,
};
const W = 1080, H = 1920, FRAMES = 884;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const f = (sec: number) => Math.round(sec * B.fps);

// 0→1 between frames a and b (eased, clamped)
const prog = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// visibility window with enter / exit
const win = (frame: number, start: number, end: number) => {
  const i = prog(frame, start, start + B.dur.in);
  const o = 1 - prog(frame, end - B.dur.out, end);
  return Math.min(i, o);
};

const label: React.CSSProperties = {
  fontFamily: B.f.sans, fontWeight: 600, fontSize: 22, letterSpacing: '0.16em', textTransform: 'uppercase',
};
const GoldBar: React.FC<{p?: number; style?: React.CSSProperties}> = ({p = 1, style}) => (
  <div style={{width: 32 * p, height: 4, background: B.c.gold, borderRadius: 2, ...style}} />
);

// ─── Video: push-in on the hook, punch on the twist, settle on chapter 01 ──
const Footage: React.FC = () => {
  const frame = useCurrentFrame();
  const s = 1
    + 0.03 * interpolate(frame, [0, f(3.8)], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)})
    + 0.04 * prog(frame, f(3.86), f(3.86) + 6)
    - 0.07 * prog(frame, HOOK_END - 6, MORPH_END);
  // origin in the top band: the face only grows downwards, away from the hook card
  return (
    <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: '540px 360px'}}>
      <OffthreadVideo src={staticFile('clip.mp4')} muted />
    </AbsoluteFill>
  );
};

// ─── 01 · HOOK ──────────────────────────────────────────────────────────────
const HOOK_END = f(7.2), MORPH_END = HOOK_END + 12;
const HK = {
  w: B.x.right - B.x.left, h: 175, padX: 36, padY: 16, size: 70, lh: 71,
  zone: {w: 232, h: 143}, pill: {w: 506, h: 64},
  tB: f(3.86), tStrike: f(4.92), tC: f(6.2), tFix: f(3.3),
};

// one text line in its own masked slot: rolls up/out, rolls in from below
const Slot: React.FC<{y: number; shift: number; children: React.ReactNode}> = ({y, shift, children}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: y - 12, height: HK.lh + 30, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 0, top: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
      transform: `translateY(${shift}px)`}}>
      {children}
    </div>
  </div>
);
// word rising out of its slot
const Rise: React.FC<{frame: number; at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({frame, at, children, style}) => {
  const p = prog(frame, at, at + 9);
  return <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 100}px)`, marginRight: '0.24em', ...style}}>{children}</span>;
};

// live EEG traces → collapse → neural network (the logo's idea: brain becoming understood)
const NODES: [number, number, number][] = [
  [16, 74, 5], [50, 30, 6], [58, 108, 5], [96, 64, 8], [118, 16, 4], [132, 116, 6],
  [152, 52, 5], [176, 92, 7], [190, 26, 5], [214, 62, 8], [224, 118, 4], [98, 134, 3],
];
const EDGES: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [3, 4], [3, 5], [2, 5], [3, 6], [4, 6], [6, 7], [5, 7], [6, 8], [4, 8], [7, 9], [8, 9], [9, 10], [7, 10], [5, 11], [2, 11]];
const trace = (frame: number, seed: number, amp: number) => {
  let d = '';
  for (let x = 0; x <= HK.zone.w; x += 3) {
    const u = x + frame * 5 + seed * 40;
    const y = amp * (0.5 * Math.sin(u / 11 + seed) + 0.32 * Math.sin(u / 4.3 + seed * 2) + 0.18 * Math.sin(u / 1.7 + seed * 5)
      + 0.5 * Math.exp(-Math.pow(((u + seed * 23) % 97) - 48, 2) / 6));
    d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
  }
  return d;
};
const HookVisual: React.FC<{frame: number}> = ({frame}) => {
  const agitate = 1 + 0.6 * prog(frame, HK.tFix, HK.tFix + 6) * (1 - prog(frame, HK.tB, HK.tB + 10));
  const collapse = 1 - prog(frame, HK.tC - 2, HK.tC + 8);
  const tOp = 1 - prog(frame, HK.tC + 2, HK.tC + 10);
  const n0 = HK.tC + 4;
  return (
    <svg width={HK.zone.w} height={HK.zone.h} viewBox={`0 0 ${HK.zone.w} ${HK.zone.h}`} style={{overflow: 'visible'}}>
      <g opacity={tOp}>
        {[0, 1, 2].map((i) => (
          <path key={i} d={trace(frame, i + 1, 13 * agitate * collapse)} transform={`translate(0 ${30 + i * 42})`} fill="none"
            stroke={i === 1 ? B.c.gold : B.c.cream} strokeOpacity={i === 1 ? 1 : 0.45} strokeWidth={i === 1 ? 3 : 2.2} strokeLinejoin="round" />
        ))}
      </g>
      {EDGES.map(([a, b], i) => {
        const p = prog(frame, n0 + 4 + i * 0.7, n0 + 12 + i * 0.7);
        const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={B.c.gold} strokeOpacity={0.75} strokeWidth="2"
          pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />;
      })}
      {NODES.map(([x, y, r], i) => {
        const p = prog(frame, n0 + i * 1.1, n0 + 7 + i * 1.1);
        return <circle key={i} cx={x} cy={y} r={r * p} fill={B.c.gold} />;
      })}
    </svg>
  );
};

const Wrench: React.FC<{frame: number}> = ({frame}) => {
  const draw = prog(frame, HK.tFix, HK.tFix + 12);
  const t = frame - (HK.tFix + 9);
  const turn = t > 0 ? 24 * Math.sin(t * 0.9) * Math.exp(-t / 9) : 0;
  return (
    <svg width="58" height="58" viewBox="0 0 24 24" style={{marginLeft: 4, transform: `rotate(${turn}deg)`, opacity: Math.min(1, draw * 3)}}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill="none" stroke={B.c.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
    </svg>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= MORPH_END) return null;
  const {tB, tStrike, tC} = HK;
  const rollOut = (i: number) => -prog(frame, tB + i * 3, tB + i * 3 + 10) * 100;
  const rollIn = (i: number) => (1 - prog(frame, tB + 4 + i * 3, tB + 14 + i * 3)) * 100;
  const gold = prog(frame, f(3.4), f(3.4) + 6);
  const strike = prog(frame, tStrike, tStrike + 12);
  const dim = interpolate(prog(frame, tStrike + 6, tStrike + 18), [0, 1], [1, 0.42]);
  const write = prog(frame, tC, tC + 12);
  const check = prog(frame, tC + 12, tC + 26);
  const m = prog(frame, HOOK_END, MORPH_END);               // card → chapter pill
  const content = 1 - prog(frame, HOOK_END - 4, HOOK_END + 4);

  const text: React.CSSProperties = {
    fontFamily: B.f.serif, fontVariationSettings: B.f.serifDisplay, fontWeight: 400,
    fontSize: HK.size, lineHeight: `${HK.lh}px`, color: B.c.cream, letterSpacing: '-0.01em',
  };
  const y1 = 0, y2 = HK.lh;
  return (
    <div style={{
      position: 'absolute', left: B.x.left, top: B.y.top, overflow: 'hidden', background: B.c.navy,
      width: interpolate(m, [0, 1], [HK.w, HK.pill.w]), height: interpolate(m, [0, 1], [HK.h, HK.pill.h]),
      borderRadius: interpolate(m, [0, 1], [B.r.card, B.r.pill]),
    }}>
      <div style={{position: 'absolute', left: HK.padX, top: HK.padY, right: HK.padX, height: HK.h - 2 * HK.padY, opacity: content, ...text}}>
        {/* A · the common belief */}
        <Slot y={y1} shift={rollOut(0)}>
          {['„Dacă', 'ceva', 'nu', 'merge,'].map((w, i) => <Rise key={w} frame={frame} at={-4 + i * 2}>{w}</Rise>)}
        </Slot>
        <Slot y={y2} shift={rollOut(1)}>
          <Rise frame={frame} at={4}>trebuie</Rise>
          <Rise frame={frame} at={6} style={{color: interpolateColor(gold, B.c.cream, B.c.gold)}}>reparat.”</Rise>
          <Wrench frame={frame} />
        </Slot>
        {/* B · the twist   C · the payoff */}
        <Slot y={y1} shift={rollIn(0)}>Primul pas e altul:</Slot>
        <Slot y={y2} shift={rollIn(1)}>
          <span style={{position: 'relative', opacity: dim}}>
            să repari
            <span style={{position: 'absolute', left: -4, top: '54%', height: 5, marginTop: -2.5, borderRadius: 3,
              width: `calc(${strike} * (100% + 8px))`, background: B.c.gold}} />
          </span>
          <span style={{color: B.c.gold, marginLeft: 28, clipPath: `inset(-20% ${(1 - write) * 100}% -30% 0)`}}>să înțelegi.</span>
          <svg width="60" height="60" viewBox="0 0 52 52" style={{marginLeft: 20, opacity: Math.min(1, check * 4)}}>
            <circle cx="26" cy="26" r="22" fill="none" stroke={B.c.gold} strokeWidth="3.5"
              pathLength={1} strokeDasharray="1" strokeDashoffset={1 - prog(frame, tC + 10, tC + 22)} />
            <path d="M15 27 L23 34 L38 18" fill="none" stroke={B.c.gold} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1" strokeDashoffset={1 - check} />
          </svg>
        </Slot>
      </div>
      <div style={{position: 'absolute', right: 32, top: HK.padY, opacity: content}}>
        <HookVisual frame={frame} />
      </div>
    </div>
  );
};

function interpolateColor(p: number, a: string, b: string) {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [A, Bc] = [h(a), h(b)];
  return `rgb(${A.map((v, i) => Math.round(v + (Bc[i] - v) * p)).join(',')})`;
}

// ─── Chapter pill (logo symbol + chapter label) ─────────────────────────────
const CHAPTERS = [
  {n: '01', t: 'Harta creierului', s: MORPH_END, e: f(15.34)},
  {n: '02', t: 'De ce contează', s: f(15.34), e: f(20.84)},
  {n: '03', t: 'Pasul următor', s: f(20.84), e: f(25.0) + 16},
];
const Chapter: React.FC = () => {
  const frame = useCurrentFrame();
  const start = MORPH_END, end = f(25.0) + 10;
  if (frame < start) return null;
  const vis = 1 - prog(frame, end - 10, end);
  if (vis <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: B.x.left, top: B.y.top, height: 64, padding: '0 28px 0 16px',
      background: B.c.navy, borderRadius: B.r.pill, display: 'flex', alignItems: 'center', gap: 16,
      opacity: vis, transform: `translateY(${(1 - vis) * -12}px)`,
    }}>
      <Img src={staticFile('logo_symbol.png')} style={{height: 40, width: 'auto', opacity: prog(frame, start, start + 10)}} />
      <div style={{position: 'relative', height: 27, width: 400}}>
        {CHAPTERS.map((c) => {
          const o = Math.min(prog(frame, c.s, c.s + 10), 1 - prog(frame, c.e - 6, c.e));
          return (
            <div key={c.n} style={{
              ...label, position: 'absolute', left: 0, top: 0, lineHeight: '27px', whiteSpace: 'nowrap',
              color: B.c.cream, opacity: o, transform: `translateY(${(1 - o) * 8}px)`,
            }}>
              <span style={{color: B.c.gold}}>{c.n} · </span>{c.t}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Chest-zone card shell ──────────────────────────────────────────────────
const Card: React.FC<{start: number; end: number; children: React.ReactNode; pad?: string; center?: boolean}> = ({start, end, children, pad = '32px 40px', center}) => {
  const frame = useCurrentFrame();
  if (frame < start || frame > end) return null;
  const i = prog(frame, start, start + B.dur.in);
  const o = prog(frame, end - B.dur.out, end);
  return (
    <div style={{
      position: 'absolute', left: B.x.left, top: B.y.card, width: B.x.rightBtnZone - B.x.left,
      background: B.c.cream, borderRadius: B.r.card, padding: pad, boxSizing: 'border-box',
      opacity: Math.min(i, 1 - o), transform: `translateY(${(1 - i) * B.slide + o * 12}px)`,
      textAlign: center ? 'center' : 'left',
    }}>
      {children}
    </div>
  );
};
const cardLabel: React.CSSProperties = {...label, color: B.c.sage, marginTop: 14};
const cardTitle: React.CSSProperties = {
  fontFamily: B.f.serif, fontVariationSettings: B.f.serifText, fontWeight: 400, fontSize: 48,
  lineHeight: 1.1, color: B.c.navy, letterSpacing: '-0.01em',
};
const Swap: React.FC<{frame: number; at: number; a: React.ReactNode; b: React.ReactNode; style?: React.CSSProperties; h: number}> = ({frame, at, a, b, style, h}) => {
  const p = prog(frame, at, at + 10);
  return (
    <div style={{position: 'relative', height: h, ...style}}>
      <div style={{position: 'absolute', inset: 0, opacity: 1 - p, transform: `translateY(${-p * 8}px)`}}>{a}</div>
      <div style={{position: 'absolute', inset: 0, opacity: p, transform: `translateY(${(1 - p) * 8}px)`}}>{b}</div>
    </div>
  );
};

// ─── 02 · Brain map (illustrative 10–20 EEG layout) ─────────────────────────
const R = 116, CX = 150, CY = 158;
const EL: Record<string, [number, number]> = {
  Fp1: [-0.25, 0.76], Fp2: [0.25, 0.76], F7: [-0.65, 0.47], F3: [-0.31, 0.4], Fz: [0, 0.38], F4: [0.31, 0.4], F8: [0.65, 0.47],
  T3: [-0.8, 0], C3: [-0.4, 0], Cz: [0, 0], C4: [0.4, 0], T4: [0.8, 0],
  T5: [-0.65, -0.47], P3: [-0.31, -0.4], Pz: [0, -0.38], P4: [0.31, -0.4], T6: [0.65, -0.47], O1: [-0.25, -0.76], O2: [0.25, -0.76],
};
const pos = (k: string) => [CX + EL[k][0] * R, CY - EL[k][1] * R] as const;
const PATTERN: [string, string][] = [['Fp1', 'F3'], ['F3', 'C3'], ['C3', 'Cz'], ['Cz', 'C4'], ['C4', 'P4'], ['P4', 'O2'], ['Fz', 'Cz'], ['F4', 'C4'], ['P3', 'Pz'], ['Pz', 'P4']];
const LIT = new Set(PATTERN.flat());
const wave = (seed: number, w: number, amp: number) => {
  let d = '';
  for (let x = 0; x <= w; x += 4) {
    const y = amp * (0.55 * Math.sin(x / (9 + seed * 2)) + 0.3 * Math.sin(x / (3.7 + seed) + seed) + 0.15 * Math.sin(x / 1.9 + seed * 3));
    d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
  }
  return d;
};

const BrainMapCard: React.FC = () => {
  const frame = useCurrentFrame();
  const s = f(11.48), e = f(15.25), tPat = s - 12, tLit = s + 24, tLink = f(14.0);
  const keys = Object.keys(EL);
  const lit = prog(frame, tLit, tLit + 12);
  return (
    <Card start={s} end={e}>
      <div style={{display: 'flex', gap: 32}}>
        <svg width="300" height="300" viewBox="0 0 300 300" style={{flexShrink: 0}}>
          <path d={`M${CX - 14} ${CY - R + 3} L${CX} ${CY - R - 20} L${CX + 14} ${CY - R + 3}`} fill="none" stroke={B.c.navy} strokeWidth="3" strokeLinejoin="round"
            pathLength={1} strokeDasharray="1" strokeDashoffset={1 - prog(frame, s + 6, s + 20)} />
          <path d={`M${CX - R + 1} ${CY - 22} q-16 22 0 44 M${CX + R - 1} ${CY - 22} q16 22 0 44`} fill="none" stroke={B.c.navy} strokeWidth="3" strokeLinecap="round"
            pathLength={1} strokeDasharray="1" strokeDashoffset={1 - prog(frame, s + 6, s + 20)} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={B.c.navy} strokeWidth="3"
            pathLength={1} strokeDasharray="1" strokeDashoffset={1 - prog(frame, s + 2, s + 22)} transform={`rotate(-90 ${CX} ${CY})`} />
          {PATTERN.map(([a, b], i) => {
            const [x1, y1] = pos(a), [x2, y2] = pos(b);
            const p = prog(frame, tLink + i * 1.5, tLink + 10 + i * 1.5);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={B.c.gold} strokeWidth="4" strokeLinecap="round"
              pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />;
          })}
          {keys.map((k, i) => {
            const [x, y] = pos(k);
            const p = prog(frame, s + 10 + i * 1.2, s + 18 + i * 1.2);
            const isLit = LIT.has(k);
            const r = (isLit ? 9 + 3 * lit : 9 - 1 * lit) * (0.6 + 0.4 * p);
            return <circle key={k} cx={x} cy={y} r={r} opacity={p * (isLit ? 1 : 1 - 0.45 * lit)}
              fill={isLit ? interpolateColor(lit, B.c.goldDark, B.c.gold) : B.c.goldDark} />;
          })}
        </svg>
        <div style={{flex: 1, paddingTop: 4}}>
          <GoldBar />
          <Swap frame={frame} at={tPat} h={27} style={{marginTop: 14}}
            a={<div style={{...label, color: B.c.sage}}>Evaluare EEG</div>}
            b={<div style={{...label, color: B.c.sage}}>Tipare</div>} />
          <Swap frame={frame} at={tPat} h={112} style={{marginTop: 12}}
            a={<div style={cardTitle}>Harta<br />creierului</div>}
            b={<div style={cardTitle}>Când vezi<br />tiparele…</div>} />
          <Swap frame={frame} at={tPat} h={70} style={{marginTop: 10}}
            a={<div style={{fontFamily: B.f.sans, fontSize: 26, lineHeight: 1.25, color: B.c.charcoal, opacity: prog(frame, s + 16, s + 28)}}>Date obiective,<br />pe înțelesul tău.</div>}
            b={<div style={{fontFamily: B.f.sans, fontWeight: 600, fontSize: 28, lineHeight: 1.25, color: B.c.navy,
              opacity: prog(frame, tLink - 2, tLink + 10), transform: `translateY(${(1 - prog(frame, tLink - 2, tLink + 10)) * 8}px)`}}>…lucrurile se leagă<br />și capătă sens.</div>} />
          <svg width="420" height="58" viewBox="0 0 420 58" style={{marginTop: 14, display: 'block', opacity: 1 - 0.5 * prog(frame, tLink, tLink + 12)}}>
            {[0, 1, 2].map((i) => (
              <path key={i} d={wave(i + 1, 420, 9)} transform={`translate(0 ${10 + i * 19})`} fill="none"
                stroke={i === 1 ? B.c.navy : B.c.sage} strokeWidth="3.5" strokeLinejoin="round"
                pathLength={1} strokeDasharray="1" strokeDashoffset={1 - prog(frame, s + 10 + i * 5, s + 40 + i * 5)} />
            ))}
          </svg>
        </div>
      </div>
      <div style={{position: 'absolute', left: 40, width: 300, bottom: 22, textAlign: 'center', fontFamily: B.f.sans, fontSize: 18, color: B.c.charcoal, opacity: 0.6}}>
        reprezentare ilustrativă
      </div>
    </Card>
  );
};

// ─── 03 · Cause → effect ────────────────────────────────────────────────────
const IconSearch: React.FC<{p: number}> = ({p}) => (
  <svg width="84" height="84" viewBox="0 0 72 72">
    <circle cx="31" cy="31" r="19" fill="none" stroke={B.c.goldDark} strokeWidth="4.5" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.min(1, p * 1.4)} />
    <line x1="45" y1="45" x2="60" y2="60" stroke={B.c.goldDark} strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.max(0, p * 2.5 - 1.5)} />
  </svg>
);
const IconCheck: React.FC<{p: number; size?: number; color?: string}> = ({p, size = 72, color = B.c.goldDark}) => (
  <svg width={size} height={size} viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="4.5" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.min(1, p * 1.5)} transform="rotate(-90 36 36)" />
    <path d="M23 37 L32 46 L50 27" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.max(0, p * 2.5 - 1.5)} />
  </svg>
);

const CauseCard: React.FC = () => {
  const frame = useCurrentFrame();
  const s = f(15.34), e = f(20.76), tArrow = f(17.22), tB = f(17.52), tWell = f(19.7);
  const a = prog(frame, s + 4, s + 22), arrow = prog(frame, tArrow, tArrow + 10), b = prog(frame, tB, tB + 20);
  const well = prog(frame, tWell, tWell + 10);
  const node: React.CSSProperties = {width: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14};
  const txt: React.CSSProperties = {fontFamily: B.f.sans, fontWeight: 600, fontSize: 38, lineHeight: 1.18, color: B.c.navy};
  return (
    <Card start={s} end={e} pad="32px 40px 36px">
      <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
        <div style={{...node, opacity: Math.min(1, a * 2)}}>
          <IconSearch p={a} />
          <div style={txt}>Afli ce<br />se întâmplă</div>
        </div>
        <svg width="120" height="72" viewBox="0 0 120 72" style={{marginTop: 6, flexShrink: 0}}>
          <line x1="8" y1="36" x2="108" y2="36" stroke={B.c.gold} strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - arrow} />
          <path d="M92 22 L110 36 L92 50" fill="none" stroke={B.c.gold} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
            opacity={prog(frame, tArrow + 6, tArrow + 10)} />
        </svg>
        <div style={{...node, opacity: Math.min(1, b * 2)}}>
          <IconCheck p={b} size={84} />
          <div style={txt}>Decizii bune</div>
          <div style={{fontFamily: B.f.sans, fontSize: 30, lineHeight: 1.25, color: B.c.charcoal, marginTop: -4,
            opacity: well, transform: `translateY(${(1 - well) * 8}px)`}}>pentru starea<br />ta de bine</div>
        </div>
      </div>
    </Card>
  );
};

// ─── 04 · Checklist ─────────────────────────────────────────────────────────
const ChecklistCard: React.FC = () => {
  const frame = useCurrentFrame();
  const s = f(20.84), e = f(24.92);
  const items = [
    {t: 'Evaluare EEG simplă', at: f(21.24)},
    {t: 'Fără nicio obligație', at: f(22.26)},
    {t: 'Vezi dacă ți se potrivește', at: f(23.62)},
  ];
  return (
    <Card start={s} end={e}>
      <GoldBar />
      <div style={cardLabel}>Primul pas</div>
      <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12}}>
        {items.map((it) => {
          const p = prog(frame, it.at, it.at + 10);
          return (
            <div key={it.t} style={{display: 'flex', alignItems: 'center', gap: 20, opacity: p, transform: `translateX(${(1 - p) * 16}px)`}}>
              <IconCheck p={prog(frame, it.at + 2, it.at + 18)} size={52} />
              <div style={{fontFamily: B.f.sans, fontWeight: 600, fontSize: 36, color: B.c.navy, whiteSpace: 'nowrap'}}>{it.t}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ─── Full-screen animated B-roll inserts ────────────────────────────────────
const SA = f(7.24), EA = f(11.4), SB = f(20.84), EB = f(24.84);
const Insert: React.FC<{start: number; end: number; children: React.ReactNode}> = ({start, end, children}) => {
  const frame = useCurrentFrame();
  if (frame < start || frame > end + 10) return null;
  const y = (1 - prog(frame, start, start + 9)) * H - prog(frame, end, end + 9) * H;   // rise in, continue up out
  return (
    <AbsoluteFill style={{background: B.c.navy, overflow: 'hidden', transform: `translateY(${y}px)`}}>
      {children}
    </AbsoluteFill>
  );
};

// A · "Harta creierului" — sensors → signal → map printed on paper
const HX = 540, HY = 612, HR = 262;
const hpos = (k: string) => [HX + EL[k][0] * HR, HY - EL[k][1] * HR] as const;
const FRONT_TO_BACK = Object.keys(EL).sort((a, b) => EL[b][1] - EL[a][1]);
const BLOBS: [number, number, number, string, number][] = [
  [150, 160, 92, B.c.sage, 0.55], [244, 168, 80, B.c.gold, 0.6], [178, 262, 86, B.c.goldDark, 0.45],
  [252, 268, 70, B.c.sage, 0.35], [116, 244, 60, B.c.gold, 0.35], [200, 104, 62, B.c.navy, 0.16],
];
const SceneMap: React.FC = () => {
  const frame = useCurrentFrame();
  const s = SA + 6, tRipple = f(8.06), tFlow = f(8.7), tSheet = f(8.9), tPrint = f(9.3), tPrintEnd = f(10.6), tZoom = f(10.3);
  const outline = prog(frame, s, s + 18);
  const sheet = prog(frame, tSheet, tSheet + 12);
  const pr = interpolate(frame, [tPrint, tPrintEnd], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  const push = 1 + 0.03 * prog(frame, s, EA) + 0.07 * prog(frame, tZoom, EA + 6);
  const flowVis = Math.min(prog(frame, tFlow, tFlow + 6), 1 - prog(frame, tPrintEnd - 4, tPrintEnd + 4));
  const cols = [400, 470, 540, 610, 680];
  return (
    <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '540px 1150px'}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        {/* head, top view */}
        <path d={`M${HX - 22} ${HY - HR + 4} L${HX} ${HY - HR - 34} L${HX + 22} ${HY - HR + 4}`} fill="none" stroke={B.c.cream} strokeWidth="4" strokeLinejoin="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset={1 - outline} />
        <path d={`M${HX - HR + 2} ${HY - 46} q-34 46 0 92 M${HX + HR - 2} ${HY - 46} q34 46 0 92`} fill="none" stroke={B.c.cream} strokeWidth="4" strokeLinecap="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset={1 - outline} />
        <circle cx={HX} cy={HY} r={HR} fill="none" stroke={B.c.cream} strokeWidth="4" transform={`rotate(-90 ${HX} ${HY})`}
          pathLength={1} strokeDasharray="1" strokeDashoffset={1 - outline} />
        {/* signal flowing from the head into the paper */}
        {cols.map((x, c) => {
          const y0 = HY + Math.sqrt(HR * HR - (x - HX) ** 2) + 10, y1 = 1004;
          return [0, 1, 2].map((k) => {
            const u = (((frame - tFlow) / 16 + k / 3 + c * 0.13) % 1 + 1) % 1;
            return <circle key={`${c}-${k}`} cx={x} cy={y0 + (y1 - y0) * u} r={6} fill={B.c.gold}
              opacity={flowVis * Math.sin(u * Math.PI)} />;
          });
        })}
        {/* electrodes (10–20 layout) + a sweep of activity front → back */}
        {FRONT_TO_BACK.map((k, i) => {
          const [x, y] = hpos(k);
          const p = prog(frame, s + 8 + i * 1.2, s + 16 + i * 1.2);
          const rt = frame - (tRipple + i * 1.5);
          const rp = rt > 0 && rt < 20 ? rt / 20 : 0;
          return (
            <g key={k}>
              {rp > 0 && <circle cx={x} cy={y} r={15 + 36 * rp} fill="none" stroke={B.c.gold} strokeWidth="3" opacity={0.8 * (1 - rp)} />}
              <circle cx={x} cy={y} r={15 * p} fill={B.c.gold} />
              <text x={x} y={y + 40} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={17} fill={B.c.cream} opacity={0.5 * p}>{k}</text>
            </g>
          );
        })}
      </svg>
      {/* the map, printed on paper */}
      <div style={{
        position: 'absolute', left: 150, top: 1010, width: 780, height: 380, borderRadius: 20, background: B.c.cream, overflow: 'hidden',
        opacity: sheet, transform: `translateY(${(1 - sheet) * 80}px)`,
      }}>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${(1 - pr) * 100}% 0)`}}>
          <div style={{...label, fontSize: 18, color: B.c.sage, position: 'absolute', left: 36, top: 28}}>Harta creierului · EEG</div>
          <svg width="780" height="380" viewBox="0 0 780 380" style={{position: 'absolute', inset: 0}}>
            <defs><clipPath id="mh"><circle cx="190" cy="220" r="124" /></clipPath></defs>
            <g clipPath="url(#mh)">
              <rect x="60" y="90" width="260" height="260" fill="#FFFFFF" />
              {BLOBS.map(([x, y, r, c, o], i) => <circle key={i} cx={x} cy={y + 6} r={r} fill={c} opacity={o} />)}
            </g>
            <circle cx="190" cy="220" r="124" fill="none" stroke={B.c.navy} strokeWidth="3" />
            <path d="M176 98 L190 80 L204 98" fill="none" stroke={B.c.navy} strokeWidth="3" strokeLinejoin="round" />
            {Object.keys(EL).map((k) => <circle key={k} cx={190 + EL[k][0] * 124} cy={220 - EL[k][1] * 124} r={3.5} fill={B.c.navy} />)}
            {[0, 1, 2, 3].map((i) => (
              <path key={i} d={wave(i * 2 + 1, 350, 13 - i * 2)} transform={`translate(384 ${120 + i * 64})`} fill="none"
                stroke={i % 2 ? B.c.sage : B.c.navy} strokeWidth="2.5" strokeLinejoin="round" />
            ))}
          </svg>
          <div style={{position: 'absolute', right: 24, bottom: 16, fontFamily: B.f.sans, fontSize: 16, color: B.c.charcoal, opacity: 0.6}}>reprezentare ilustrativă</div>
        </div>
        {pr > 0 && pr < 1 && <div style={{position: 'absolute', left: 0, right: 0, top: `${pr * 100}%`, height: 4, marginTop: -2, background: B.c.gold}} />}
      </div>
    </AbsoluteFill>
  );
};

// B · "O evaluare simplă" — the EEG evaluation in three steps
const StepIcon: React.FC<{i: number; p: number}> = ({i, p}) => {
  const d = {pathLength: 1, strokeDasharray: '1', strokeDashoffset: 1 - p, fill: 'none', stroke: B.c.gold, strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width="104" height="104" viewBox="0 0 96 96">
      {i === 0 && <>
        <circle cx="48" cy="54" r="30" {...d} />
        {[[48, 24], [28, 32], [68, 32], [20, 52], [76, 52]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r={5.5 * Math.min(1, Math.max(0, p * 3 - 1 - k * 0.2))} fill={B.c.gold} />)}
      </>}
      {i === 1 && <>
        <rect x="10" y="16" width="76" height="54" rx="8" {...d} />
        <path d="M48 70 V82 M34 82 H62" {...d} />
        <path d="M18 46 H30 L36 30 L44 60 L52 36 L58 50 L64 44 H78" {...d} stroke={B.c.cream} />
      </>}
      {i === 2 && <>
        <path d="M24 10 H60 L76 26 V86 H24 Z M60 10 V26 H76" {...d} />
        <circle cx="50" cy="50" r="14" {...d} stroke={B.c.cream} />
        <path d="M34 74 H66" {...d} />
      </>}
    </svg>
  );
};
const STEPS = [
  {n: '01', t: 'Senzori pe scalp', s: 'non-invaziv', at: f(21.1)},
  {n: '02', t: 'Înregistrare EEG', s: 'activitatea creierului', at: f(21.7)},
  {n: '03', t: 'Harta ta, explicată', s: 'pe înțelesul tău', at: f(22.3)},
];
const SceneSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const s = SB + 6, tBadge = f(22.6), tDone = f(23.62);
  const title = prog(frame, s, s + 12);
  const badge = prog(frame, tBadge, tBadge + 10);
  const Y0 = 600, GAP = 220, CX0 = 172, CR = 52;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: B.x.left + 56, top: 316, fontFamily: B.f.serif, fontVariationSettings: B.f.serifDisplay,
        fontSize: 76, lineHeight: 1.05, color: B.c.cream, opacity: title, transform: `translateY(${(1 - title) * B.slide}px)`, whiteSpace: 'nowrap'}}>
        O evaluare <span style={{color: B.c.gold}}>simplă.</span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        {[0, 1].map((i) => (
          <line key={i} x1={CX0} y1={Y0 + i * GAP + CR + 8} x2={CX0} y2={Y0 + (i + 1) * GAP - CR - 8} stroke={B.c.gold} strokeWidth="4" strokeLinecap="round"
            pathLength={1} strokeDasharray="1" strokeDashoffset={1 - prog(frame, STEPS[i].at + 6, STEPS[i + 1].at + 2)} />
        ))}
      </svg>
      {STEPS.map((st, i) => {
        const p = prog(frame, st.at, st.at + 12);
        const done = prog(frame, tDone + i * 4, tDone + i * 4 + 8);
        const y = Y0 + i * GAP;
        return (
          <div key={st.n} style={{position: 'absolute', left: 0, top: y - CR, width: W, height: CR * 2, opacity: p}}>
            <div style={{position: 'absolute', left: CX0 - CR, top: 0, width: CR * 2, height: CR * 2, borderRadius: CR, boxSizing: 'border-box',
              border: `4px solid ${B.c.gold}`, background: interpolateColor(done, B.c.navy, B.c.gold),
              display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.7 + 0.3 * p})`,
              fontFamily: B.f.sans, fontWeight: 600, fontSize: 34, color: interpolateColor(done, B.c.gold, B.c.navy)}}>{st.n}</div>
            <div style={{position: 'absolute', left: 264, top: 2, transform: `translateX(${(1 - p) * B.slide}px)`}}>
              <div style={{fontFamily: B.f.sans, fontWeight: 600, fontSize: 46, lineHeight: 1.15, color: B.c.cream, whiteSpace: 'nowrap'}}>{st.t}</div>
              <div style={{fontFamily: B.f.sans, fontSize: 30, lineHeight: 1.3, color: B.c.cream, opacity: 0.7, whiteSpace: 'nowrap'}}>{st.s}</div>
            </div>
            <div style={{position: 'absolute', left: 832, top: 0}}><StepIcon i={i} p={prog(frame, st.at + 4, st.at + 22)} /></div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, width: W, top: 1236, display: 'flex', justifyContent: 'center', opacity: badge, transform: `translateY(${(1 - badge) * 16}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '14px 32px 14px 22px', borderRadius: 999, border: `2px solid rgba(250,247,241,0.45)`}}>
          <IconCheck p={prog(frame, tBadge + 4, tBadge + 18)} size={44} color={B.c.gold} />
          <span style={{fontFamily: B.f.sans, fontWeight: 600, fontSize: 34, color: B.c.cream}}>Fără nicio obligație</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── End card · logo + single CTA ───────────────────────────────────────────
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const s = f(25.0);
  const logo = prog(frame, s + 4, s + 16), tag = prog(frame, s + 10, s + 22), btn = prog(frame, s + 16, s + 28);
  const chev = prog(frame, s + 30, s + 40);
  const bob = Math.sin((frame - s) / 7) * 4;
  return (
    <Card start={s} end={FRAMES + 20} pad="44px 40px 32px" center>
      <Img src={staticFile('logo_full.png')} style={{width: 400, height: 'auto', opacity: logo, display: 'block', margin: '0 auto'}} />
      <div style={{...label, fontSize: 20, color: B.c.sage, marginTop: 40, opacity: tag}}>Neurofeedback &amp; brainmapping EEG</div>
      <div style={{
        display: 'inline-block', marginTop: 28, padding: '22px 44px', borderRadius: 999, background: B.c.terracotta,
        fontFamily: B.f.sans, fontWeight: 600, fontSize: 34, color: B.c.cream, whiteSpace: 'nowrap',
        opacity: btn, transform: `translateY(${(1 - btn) * 16}px)`,
      }}>
        Programează-ți scanarea creierului
      </div>
      <svg width="44" height="30" viewBox="0 0 44 30" style={{display: 'block', margin: '18px auto 0', opacity: chev, transform: `translateY(${bob}px)`}}>
        <path d="M6 8 L22 22 L38 8" fill="none" stroke={B.c.goldDark} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Card>
  );
};

// ─── Subtitles · Inter Semibold, white on semi-transparent navy ─────────────
const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / B.fps;
  const idx = PHRASES.findIndex((p, i) => {
    const next = PHRASES[i + 1];
    const end = next ? next[0].s : p[p.length - 1].e + 0.4;
    return t >= p[0].s - 0.05 && t < end;
  });
  if (idx < 0) return null;
  const p = PHRASES[idx];
  const o = prog(frame, f(p[0].s) - 2, f(p[0].s) + 3);
  return (
    <div style={{
      position: 'absolute', left: B.x.left, width: B.x.rightBtnZone - B.x.left, bottom: H - B.y.subBottom,
      textAlign: 'center', opacity: o, textWrap: 'balance',
    } as React.CSSProperties}>
      <span style={{
        fontFamily: B.f.sans, fontWeight: 600, fontSize: 46, lineHeight: 1.42, color: B.c.white,
        background: B.c.subBg, padding: '6px 16px', borderRadius: B.r.sub,
        boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
      }}>
        {p.map((w: Word, i) => {
          const spoken = t >= w.s - 0.04;
          return (
            <React.Fragment key={i}>
              <span style={{whiteSpace: 'nowrap', color: w.a ? B.c.gold : B.c.white, opacity: spoken ? 1 : 0.45}}>{w.t}</span>
              {i < p.length - 1 ? ' ' : ''}
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};

// ─── Font gate (diacritics) ─────────────────────────────────────────────────
const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const test = 'ĂÂÎȘȚ ăâîșț „”';
    Promise.all([
      document.fonts.load(`400 56px 'Fraunces Variable'`, test),
      document.fonts.load(`400 22px 'Inter'`, test),
      document.fonts.load(`600 46px 'Inter'`, test),
    ]).then(() => document.fonts.ready).then(() => continueRender(handle));
  }, [handle]);
};

const Synaptica: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{background: B.c.navy}}>
      <Footage />
      <Insert start={SA} end={EA}><SceneMap /></Insert>
      <Insert start={SB} end={EB}><SceneSteps /></Insert>
      <Hook />
      <Chapter />
      <BrainMapCard />
      <CauseCard />
      <EndCard />
      <Subtitles />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition id="Synaptica" component={Synaptica} durationInFrames={FRAMES} fps={B.fps} width={W} height={H} />
);
registerRoot(Root);
