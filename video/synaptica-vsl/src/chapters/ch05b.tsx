// Chapter 05b — the session (172.853 – 186.833 s). Times are OUTPUT seconds, synced to words in data/subs_out.json.
// 172.853 navy scene (fade in): client clip „cabluri” (hands + sensors) in a portrait card, steps build on the right
// 177.463 crossfade to clip „neurofeedback” (TV visual) · 179.963 cut back to Rebeca (camera 112 %)
// 180.11 card: timer ring draws 0 → 33 on „33 de minute” · holds until 186.6 (no feedback-loop schematic — not said in the cut)
import React from 'react';
import { B } from '../brand';
import { enter, p, useT, win } from '../lib';
import { Body, Card, Draw, GoldBar, Illustrative, Label, Scene, Title } from '../ui/kit';
import { VerticalClip } from '../ui/media';

const T = { scene: 172.853, sceneEnd: 179.963, swap: 177.463, cum: 173.2, cinci: 174.09, capteaza: 175.47, invaziv: 176.5, muzica: 178.09,
  card: 180.11, n33: 182.45, minute: 183.09, cardEnd: 186.6 };
export const NAVY: Array<[number, number]> = [[T.scene, T.sceneEnd]];
export const HIDE_SUBS: Array<[number, number]> = [];

// ─── step icons (gold line drawings on navy) ───
const IconSensors: React.FC<{ k: number }> = ({ k }) => (
  <svg width={84} height={84} viewBox="0 0 84 84">
    <Draw d="M42 12 C22 12 14 28 14 42 C14 58 26 70 42 70 C58 70 70 58 70 42 C70 28 62 12 42 12 Z" k={k} color={B.c.gold} width={3.5} />
    {[[34, 18], [50, 18], [42, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4.5 * Math.min(1, Math.max(0, k * 3 - 1 - i * 0.3))} fill={B.c.gold} />)}
    {[[12, 46], [72, 46]].map(([x, y], i) => <rect key={i} x={x - 3} y={y - 7} width={6} height={14} rx={3} fill={B.c.gold} opacity={Math.min(1, Math.max(0, k * 3 - 1.8))} />)}
  </svg>
);
const IconSignal: React.FC<{ k: number }> = ({ k }) => (
  <svg width={84} height={84} viewBox="0 0 84 84">
    <Draw d="M8 46 H22 L28 30 L36 60 L44 22 L52 54 L58 40 L62 46 H76" k={k} color={B.c.gold} width={3.5} />
  </svg>
);
const IconMusicScreen: React.FC<{ k: number }> = ({ k }) => (
  <svg width={84} height={84} viewBox="0 0 84 84">
    <Draw d="M10 44 V40 C10 24 22 14 34 14 C46 14 56 24 56 40 V44" k={k} color={B.c.gold} width={3.5} />
    <Draw d="M8 44 H18 V62 H8 Z M48 44 H58 V62 H48 Z" k={k} color={B.c.gold} width={3.5} />
    <Draw d="M60 22 H80 V38 H60 Z M70 38 V44" k={Math.max(0, k * 1.4 - 0.4)} color={B.c.gold} width={3} />
  </svg>
);

const STEPS = [
  { at: T.cinci, Icon: IconSensors, text: '5 senzori mici, pe scalp și urechi' },
  { at: T.capteaza, Icon: IconSignal, text: 'Captează activitatea creierului' },
  { at: T.muzica, Icon: IconMusicScreen, text: 'Muzică în căști și imagini pe ecran' },
];

const SessionScene: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.scene || t >= T.sceneEnd) return null;
  const title = p(t, T.cum - 0.1, T.cum + 0.3);
  const swap = p(t, T.swap - 0.15, T.swap + 0.15);
  const badge = p(t, T.invaziv, T.invaziv + 0.3);
  return (
    <Scene start={T.scene} end={T.sceneEnd} tone="navy" enterMode="fade" exitMode="cut">
      {/* client B-roll: portrait card, left */}
      <VerticalClip clip="cabluri" start={T.scene} dur={T.swap + 0.2 - T.scene} clipFrom={0.0} x={120} y={72} w={432} h={768} />
      <div style={{ opacity: swap }}>
        <VerticalClip clip="neurofeedback" start={T.swap - 0.15} dur={T.sceneEnd - T.swap + 0.15} clipFrom={1.0} x={120} y={72} w={432} h={768} />
      </div>
      {/* steps, right */}
      <div style={{ position: 'absolute', left: 680, top: 150, width: 1100 }}>
        <div style={{ ...enter(title, 'up') }}>
          <GoldBar style={{ marginBottom: 18 }} />
          <Label tone="navy">Neurofeedback</Label>
          <Title tone="navy" size={68} style={{ marginTop: 14 }}>Cum arată o ședință</Title>
        </div>
        <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', gap: 40 }}>
          {STEPS.map((s, i) => {
            const k = p(t, s.at - 0.05, s.at + 0.3);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, ...enter(k, 'left', 18) }}>
                <s.Icon k={p(t, s.at, s.at + 0.7)} />
                <Body tone="navy" size={44}>{s.text}</Body>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 40, display: 'inline-block', padding: '10px 22px', borderRadius: 999, border: `2px solid ${B.c.gold}`, ...enter(badge, 'up', 12) }}>
          <Body tone="navy" size={28} style={{ color: B.c.gold }}>Non-invaziv</Body>
        </div>
      </div>
      <Illustrative tone="navy" text="Iconițe: reprezentare ilustrativă" style={{ position: 'absolute', right: 96, top: 780 }} />
    </Scene>
  );
};

// ─── 180.11 → 186.6 · one session ≈ 33 minutes ───
const TimerCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.card || t > T.cardEnd) return null;
  const k = win(t, T.card, T.cardEnd, 0.3, 0.3);
  const arc = p(t, T.n33 - 1.4, T.n33 + 0.35);
  const n = Math.round(33 * arc);
  const R = 118, C = 2 * Math.PI * R;
  const txt = p(t, T.minute - 0.2, T.minute + 0.2);
  return (
    <Card start={T.card} end={T.cardEnd} x={1224} y={190} w={600} h={540} from="right">
      <Label>O ședință de neurofeedback</Label>
      <div style={{ position: 'relative', width: 300, height: 300, margin: '34px auto 0' }}>
        <svg width={300} height={300} viewBox="0 0 300 300" style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={150} cy={150} r={R} fill="none" stroke={B.c.sageLine} strokeWidth={10} />
          <circle cx={150} cy={150} r={R} fill="none" stroke={B.c.goldDark} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={`${C * (33 / 60) * arc} ${C}`} transform="rotate(-90 150 150)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: k }}>
          <Title size={88} style={{ lineHeight: 1 }}>{n}</Title>
          <Body size={26} weight={400} style={{ color: B.c.charcoal, marginTop: 6 }}>minute</Body>
        </div>
      </div>
      <Body size={34} style={{ textAlign: 'center', marginTop: 26, color: B.c.navy, ...enter(txt, 'up', 12) }}>aproximativ 33 de minute</Body>
    </Card>
  );
};

const Ch05b: React.FC = () => {
  const t = useT();
  if (t < 172 || t > 187) return null;
  return (
    <>
      <SessionScene t={t} />
      <TimerCard t={t} />
    </>
  );
};
export default Ch05b;
