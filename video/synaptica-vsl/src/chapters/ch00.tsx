// Chapter 00 — Hook (0 – 21.17 s). Times are OUTPUT seconds.
// 0–2.2 quote card · 4.1 name · 6.4 grid card on "harta creierului" · 9.2→9.5 card grows to full screen,
// circles fly into a real map that fills in · 12.93 open question (no claims) · 18.97 roadmap band.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { B } from '../brand';
import { enter, mix, mixColor, p, useT, win } from '../lib';
import { Body, Card, GoldBar, Label, LowerThird, Note, Title } from '../ui/kit';
import { MapImage, fullView, geom, lerpView } from '../ui/maps';

export const NAVY: Array<[number, number]> = [[9.5, 12.933]];
export const HIDE_SUBS: Array<[number, number]> = [[0, 1.9]];

const T = { hookOut: 1.9, name: 4.12, nameOut: 6.3, grid: 6.4, harta: 6.66, grow: 9.2, fs: 9.5, poza: 10.86, back: 12.933, arata: 13.86, qOut: 18.75, road: 18.967, roadOut: 21.1 };

// ─── 0–2.2 · the quote, word by word, rising out of slots ───
const HOOK = [
  { w: 'Stai!', at: -0.12, line: 0, gold: false }, { w: 'Deci', at: 0.84, line: 1 }, { w: 'de', at: 1.0, line: 1 }, { w: 'asta', at: 1.14, line: 1 },
  { w: 'fac', at: 1.3, line: 2 }, { w: 'așa.', at: 1.52, line: 2 },
];
const HookCard: React.FC<{ t: number }> = ({ t }) => {
  if (t > T.hookOut + 0.35) return null;
  const k = Math.min(p(t, -0.2, 0.15), 1 - p(t, T.hookOut, T.hookOut + 0.3));
  const q1 = p(t, -0.1, 0.25), q2 = p(t, 1.62, 1.85);
  return (
    <div style={{ position: 'absolute', left: 96, top: 196, width: 600, padding: '40px 44px 44px', boxSizing: 'border-box', borderRadius: B.r.card, background: B.c.navy, ...enter(k, 'left') }}>
      <GoldBar k={p(t, -0.1, 0.3)} style={{ marginBottom: 18 }} />
      <Label tone="navy" style={{ opacity: p(t, 0, 0.3) }}>Ce aud în clinică</Label>
      <div style={{ marginTop: 20, fontFamily: B.f.serif, fontVariationSettings: B.f.serifDisplay, fontSize: 76, lineHeight: '84px', color: B.c.cream, letterSpacing: '-0.01em' }}>
        {[0, 1, 2].map((ln) => (
          <div key={ln} style={{ height: 84, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {ln === 0 && <span style={{ color: B.c.gold, opacity: q1, display: 'inline-block', transform: `translateY(${(1 - q1) * 30}px)` }}>„</span>}
            {HOOK.filter((h) => h.line === ln).map((h) => {
              const r = p(t, h.at, h.at + 0.28);
              return <span key={h.w} style={{ display: 'inline-block', marginRight: '0.22em', transform: `translateY(${(1 - r) * 88}px)` }}>{h.w}</span>;
            })}
            {ln === 2 && <span style={{ color: B.c.gold, opacity: q2, display: 'inline-block', marginLeft: '-0.2em', transform: `translateY(${(1 - q2) * 30}px)` }}>”</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── 6.4 → 12.93 · grid card that grows into the full-screen real map ───
const CARD = { x: 1224, y: 160, w: 600, h: 480 };
const GRID = { x: 1224 + 36, y: 160 + 140, w: 528, h: 296 };   // 9×5 outline grid inside the card
const WINDOW = { x: 760, y: 120, w: 1064, h: 640 };               // cream window in the full-screen scene
const cardGridPos = (r: number, c: number) => {
  const px = GRID.w / 9, py = GRID.h / 5;
  return { x: GRID.x + px * (c + 0.5), y: GRID.y + py * (r + 0.5), r: Math.min(px, py) * 0.4 };
};

const GridToMap: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.grid || t >= T.back) return null;
  const fv = fullView('map1_alerta');
  const kb = p(t, T.fs, T.back, (x) => x);                                // slow Ken Burns on the real map
  const view = lerpView(fv, { x0: fv.x1 * 0.03, y0: fv.y1 * 0.03, x1: fv.x1 * 0.97, y1: fv.y1 * 0.97 }, kb);
  const g = geom('map1_alerta', WINDOW, view);
  const grow = p(t, T.grow, T.fs);                       // 0 card → 1 full screen
  const cardIn = p(t, T.grid, T.grid + 0.35);
  // card rect morphs to full frame; background cream → navy
  const rx = mix(CARD.x, 0, grow), ry = mix(CARD.y, 0, grow), rw = mix(CARD.w, 1920, grow), rh = mix(CARD.h, 1080, grow);
  const bg = mixColor(grow, B.c.cream, B.c.navy);
  const fs = t >= T.fs;
  const winK = p(t, T.fs - 0.1, T.fs + 0.25);
  const order = (r: number, c: number) => r * 9 + c;                       // fill order: row by row
  const fillAt = (r: number, c: number) => T.fs + 0.25 + order(r, c) * 0.05;
  const qk = p(t, T.poza - 0.1, T.poza + 0.35);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: rx, top: ry, width: rw, height: rh, borderRadius: mix(B.r.card, 0, grow), background: bg,
        opacity: cardIn, transform: `translateY(${(1 - cardIn) * 24}px)` }} />
      {/* card texts (fade out while growing) */}
      <div style={{ position: 'absolute', left: CARD.x + 36, top: CARD.y + 36, opacity: cardIn * (1 - p(t, T.grow, T.grow + 0.15)), transform: `translateY(${(1 - cardIn) * 24}px)` }}>
        <GoldBar style={{ marginBottom: 18 }} />
        <Label>Harta creierului</Label>
        <Label style={{ marginTop: 6, color: B.c.charcoal }}>Evaluare EEG</Label>
      </div>
      {/* full-screen texts */}
      {fs && (
        <div style={{ position: 'absolute', left: 120, top: 250, width: 560 }}>
          <div style={{ ...enter(p(t, T.fs, T.fs + 0.4), 'left') }}>
            <GoldBar style={{ marginBottom: 18 }} />
            <Label tone="navy">Harta creierului</Label>
          </div>
          <div style={{ marginTop: 26, ...enter(qk, 'up') }}>
            <Title tone="navy" size={68}>Doar o poză<br />cu cercuri?</Title>
          </div>
        </div>
      )}
      {fs && (
        <div style={{ position: 'absolute', left: WINDOW.x - 24, top: WINDOW.y - 24, width: WINDOW.w + 48, height: WINDOW.h + 48, borderRadius: B.r.card, background: B.c.cream, opacity: winK }} />
      )}
      {fs && <MapImage name="map1_alerta" box={WINDOW} view={view} bg={B.c.cream} reveal={(r, c) => p(t, fillAt(r, c), fillAt(r, c) + 0.3)} style={{ opacity: winK }} />}
      {fs && (
        <div style={{ position: 'absolute', left: WINDOW.x, top: WINDOW.y + WINDOW.h + 40, opacity: p(t, 11.2, 11.6) }}>
          <Note tone="navy">Hartă EEG reală · exemplu anonimizat</Note>
        </div>
      )}
      {/* outline circles: draw in the card, then fly to the window grid, then fade as the real circles fill */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        {[0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
          const a = cardGridPos(r, c), b = g.pos(r, c);
          const x = mix(a.x, b.x, grow), y = mix(a.y, b.y, grow), rad = mix(a.r, g.r, grow);
          const draw = p(t, T.harta + order(r, c) * 0.028, T.harta + order(r, c) * 0.028 + 0.35);
          const gone = fs ? p(t, fillAt(r, c), fillAt(r, c) + 0.3) : 0;
          if (gone >= 1) return null;
          const col = mixColor(grow, B.c.goldDark, B.c.gold);
          return <circle key={`${r}${c}`} cx={x} cy={y} r={rad} fill="none" stroke={col} strokeWidth={3} pathLength={1}
            strokeDasharray="1" strokeDashoffset={1 - draw} opacity={(1 - gone) * cardIn} transform={`rotate(-90 ${x} ${y})`} />;
        }))}
      </svg>
    </AbsoluteFill>
  );
};

// ─── 12.93 → 18.75 · open question over Rebeca (no claims about emotions/sleep) ───
const OpenQuestion: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.back || t > T.qOut) return null;
  const k = win(t, T.back, T.qOut, 0.3, 0.3);
  const box = { x: 1260, y: 196, w: 528, h: 330 };
  const qk = p(t, T.arata - 0.15, T.arata + 0.3);
  return (
    <>
      <Card start={T.back} end={T.qOut} x={1224} y={160} w={600} h={560} from="right">
        <Label>Hartă EEG reală · exemplu</Label>
      </Card>
      <MapImage name="map1_alerta" box={{ ...box, y: box.y + 56 }} bg={B.c.cream} style={{ ...enter(k, 'right') }} />
      <div style={{ position: 'absolute', left: 1260, top: 600, width: 528, ...enter(Math.min(k, qk), 'up') }}>
        <Title size={44}>Ce arată, de fapt, cercurile?</Title>
      </div>
    </>
  );
};

// ─── 18.97 → 21.1 · roadmap band (one line, no numbers) ───
const ROAD = [{ s: 'Cum se citește', at: 19.0 }, { s: '5 exemple', at: 19.57 }, { s: 'Ce se poate face', at: 20.04 }];
const Roadmap: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.road || t > T.roadOut) return null;
  const k = win(t, T.road, T.roadOut, 0.3, 0.2);
  return (
    <div style={{ position: 'absolute', left: 96, top: 56, height: 64, padding: '0 30px', borderRadius: B.r.pill, background: B.c.cream, display: 'flex', alignItems: 'center', gap: 18, ...enter(k, 'left') }}>
      <GoldBar style={{ width: 24 }} />
      {ROAD.map((r, i) => (
        <React.Fragment key={r.s}>
          {i > 0 && <span style={{ color: B.c.goldDark, fontFamily: B.f.sans, fontSize: 28, opacity: p(t, r.at, r.at + 0.25) }}>·</span>}
          <Body size={28} style={{ color: B.c.navy, whiteSpace: 'nowrap', ...enter(p(t, r.at, r.at + 0.3), 'up', 12) }}>{r.s}</Body>
        </React.Fragment>
      ))}
    </div>
  );
};

const Ch00: React.FC = () => {
  const t = useT();
  if (t > 21.2) return null;
  return (
    <>
      <HookCard t={t} />
      <LowerThird start={T.name} end={T.nameOut} name="Rebeca" role="Specialist în brainmapping · Synaptica Cluj" />
      <GridToMap t={t} />
      <OpenQuestion t={t} />
      <Roadmap t={t} />
    </>
  );
};
export default Ch00;
