// Chapter 07 — Primul pas (213.07 – 229.70 s). Times are OUTPUT seconds.
// 213.07 pill (central) · 215.57 camera 112 %, breath, no graphics · 219.9 steps (left) + logo/CTA (right) · 225.03 end card.
import React from 'react';
import { B, TOTAL_FRAMES, FPS } from '../brand';
import { enter, p, useT, win } from '../lib';
import { Body, Card, CtaButton, Draw, Label, Logo, Note, Scene, Title } from '../ui/kit';

export const NAVY: Array<[number, number]> = [];
export const HIDE_SUBS: Array<[number, number]> = [[225.03, 999]];

const END = TOTAL_FRAMES / FPS;   // 229.70
const T = { steps: 219.91, logo: 220.03, s1: 220.21, s2: 221.85, s3: 222.57, cardsOut: 225.1, end: 225.03 };
const STEPS = [
  { n: '1', t: 'Completezi formularul', at: T.s1 },
  { n: '2', t: 'Te sunăm noi', at: T.s2 },
  { n: '3', t: 'Programăm evaluarea EEG', at: T.s3 },
];

const Steps: React.FC<{ t: number }> = ({ t }) => {
  const X = 96, Y = 180, CX = 96 + 40 + 30, ROW0 = Y + 160, GAP = 132;
  return (
    <>
      <Card start={T.steps} end={T.cardsOut} x={X} y={Y} w={600} h={500} from="left" pad={40}>
        <Label>Pasul următor</Label>
      </Card>
      {t >= T.steps && t <= T.cardsOut && (
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: win(t, T.steps, T.cardsOut, 0.3, 0.25) }}>
          {[0, 1].map((i) => (
            <Draw key={i} d={`M${CX} ${ROW0 + i * GAP + 34} L${CX} ${ROW0 + (i + 1) * GAP - 34}`} k={p(t, STEPS[i].at + 0.2, STEPS[i + 1].at)} color={B.c.goldDark} width={4} />
          ))}
          {STEPS.map((s, i) => (
            <Draw key={s.n} d={`M${CX} ${ROW0 + i * GAP - 30} a30 30 0 1 1 -0.01 0`} k={p(t, s.at - 0.05, s.at + 0.35)} color={B.c.goldDark} width={4} />
          ))}
        </svg>
      )}
      {t >= T.steps && t <= T.cardsOut && STEPS.map((s, i) => {
        const k = Math.min(p(t, s.at - 0.05, s.at + 0.3), 1 - p(t, T.cardsOut - 0.25, T.cardsOut));
        return (
          <div key={s.n} style={{ position: 'absolute', left: CX - 30, top: ROW0 + i * GAP - 30, height: 60, display: 'flex', alignItems: 'center', gap: 28, ...enter(k, 'left', 16) }}>
            <div style={{ width: 60, textAlign: 'center', fontFamily: B.f.sans, fontWeight: 600, fontSize: 28, color: B.c.goldDark }}>{s.n}</div>
            <Body size={36} style={{ color: B.c.navy, whiteSpace: 'nowrap' }}>{s.t}</Body>
          </div>
        );
      })}
    </>
  );
};

const Chevron: React.FC<{ t: number; size?: number; color?: string }> = ({ t, size = 34, color = B.c.goldDark }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" style={{ transform: `translateY(${Math.sin(t * 3.2) * 4}px)` }}>
    <path d="M7 12 L17 22 L27 12" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CtaCard: React.FC<{ t: number }> = ({ t }) => {
  const lk = p(t, T.logo + 0.1, T.logo + 0.45), bk = p(t, T.s1 + 0.2, T.s1 + 0.55), ak = p(t, T.s1 + 0.5, T.s1 + 0.85);
  return (
    <Card start={T.logo} end={T.cardsOut} x={1224} y={200} w={600} from="right" pad={44} bar={false} style={{ textAlign: 'center' }}>
      <div style={{ padding: '24px 0 36px', opacity: lk }}>
        <Logo width={300} style={{ margin: '0 auto' }} />
      </div>
      <CtaButton k={bk} size={27} style={{ padding: '20px 30px' }} />
      <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: ak }}>
        <Chevron t={t} />
        <Body size={26} weight={400} style={{ color: B.c.charcoal }}>Formularul e sub video</Body>
      </div>
    </Card>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const a = p(t, T.end + 0.15, T.end + 0.55), b = p(t, T.end + 0.45, T.end + 0.85), c = p(t, T.end + 0.8, T.end + 1.15), d = p(t, T.end + 1.1, T.end + 1.5);
  return (
    <Scene start={T.end} end={END + 1} tone="cream" enterMode="fade">
      <div style={{ position: 'absolute', left: 0, width: 1920, top: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ opacity: a }}><Logo width={420} /></div>
        <div style={{ marginTop: 60, ...enter(b, 'up') }}>
          <Title size={66} style={{ lineHeight: 1.12 }}>Creierul tău poate învăța altfel —<br />și începem prin a-l vedea.</Title>
        </div>
        <div style={{ marginTop: 48 }}><CtaButton k={c} size={32} /></div>
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10, opacity: c }}>
          <Chevron t={t} />
          <Body size={28} weight={400} style={{ color: B.c.charcoal }}>Completează formularul de sub video</Body>
        </div>
        <div style={{ marginTop: 72, width: 1200, opacity: d }}>
          <div style={{ width: 64, height: 2, background: B.c.goldDark, margin: '0 auto 22px' }} />
          <Note style={{ fontSize: 34, lineHeight: 1.32 }}>
            Neurofeedback-ul este antrenament cerebral non-invaziv<br />și nu înlocuiește consultul, diagnosticul<br />sau tratamentul medical.
          </Note>
        </div>
      </div>
    </Scene>
  );
};

const Ch07: React.FC = () => {
  const t = useT();
  if (t < 213) return null;
  return (
    <>
      <Steps t={t} />
      <CtaCard t={t} />
      <EndCard t={t} />
    </>
  );
};
export default Ch07;
