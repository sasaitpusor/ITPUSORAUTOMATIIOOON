// Shared UI kit — every chapter composes these so the whole VSL reads as one system.
// Colours: cream cards (map reading, cards over camera) · navy scenes (abstract, B-roll, quotes).
// On cream: lines/icons goldDark, text charcoal/navy, small labels sage. On navy: gold accents, cream text.
// Terracotta ONLY on the single CTA button. No shadows, no gradients.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { B } from '../brand';
import { enter, p, useT, win } from '../lib';

export type Tone = 'cream' | 'navy';
const ink = (tone: Tone) => (tone === 'cream' ? { text: B.c.charcoal, title: B.c.navy, label: B.c.sage, line: B.c.goldDark }
  : { text: B.c.cream, title: B.c.cream, label: B.c.gold, line: B.c.gold });
export const inkOf = ink;

export const GoldBar: React.FC<{ k?: number; style?: React.CSSProperties }> = ({ k = 1, style }) => (
  <div style={{ width: 32 * k, height: 4, borderRadius: 2, background: B.c.gold, ...style }} />
);

/** Card with the brand gold bar; appears/disappears on its own window (output seconds). */
export const Card: React.FC<{
  start: number; end: number; x: number; y: number; w: number; h?: number; tone?: Tone; from?: 'left' | 'right' | 'up' | 'down';
  pad?: number; bar?: boolean; style?: React.CSSProperties; children: React.ReactNode; inS?: number; outS?: number;
}> = ({ start, end, x, y, w, h, tone = 'cream', from = 'up', pad = 36, bar = true, style, children, inS = 0.3, outS = 0.25 }) => {
  const t = useT();
  if (t < start || t > end) return null;
  const k = win(t, start, end, inS, outS);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', padding: pad, borderRadius: B.r.card,
      background: tone === 'cream' ? B.c.cream : B.c.navy, ...enter(k, from), ...style }}>
      {bar && <GoldBar style={{ marginBottom: 18 }} />}
      {children}
    </div>
  );
};

export const Label: React.FC<{ tone?: Tone; children: React.ReactNode; style?: React.CSSProperties }> = ({ tone = 'cream', children, style }) => (
  <div style={{ fontFamily: B.f.sans, fontWeight: 600, fontSize: B.t.label, letterSpacing: B.t.labelTracking, textTransform: 'uppercase', color: ink(tone).label, ...style }}>{children}</div>
);
export const Title: React.FC<{ tone?: Tone; size?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ tone = 'cream', size = B.t.cardTitle, children, style }) => (
  <div style={{ fontFamily: B.f.serif, fontVariationSettings: size >= 56 ? B.f.serifDisplay : B.f.serifText, fontWeight: 400, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.01em', color: ink(tone).title, ...style }}>{children}</div>
);
export const Body: React.FC<{ tone?: Tone; size?: number; weight?: 400 | 600; children: React.ReactNode; style?: React.CSSProperties }> = ({ tone = 'cream', size = B.t.body, weight = 600, children, style }) => (
  <div style={{ fontFamily: B.f.sans, fontWeight: weight, fontSize: size, lineHeight: 1.25, color: ink(tone).text, ...style }}>{children}</div>
);
/** Mandatory compliance note: Inter Regular ≥ 30 px, 100 % opacity. */
export const Note: React.FC<{ tone?: Tone; children: React.ReactNode; style?: React.CSSProperties }> = ({ tone = 'cream', children, style }) => (
  <div style={{ fontFamily: B.f.sans, fontWeight: 400, fontSize: B.t.note, lineHeight: 1.3, color: tone === 'cream' ? B.c.charcoal : B.c.cream, ...style }}>{children}</div>
);
/** "Reprezentare ilustrativă" — Inter ≥ 24 px, 100 %. Place bottom-right of every schematic without real data. */
export const Illustrative: React.FC<{ tone?: Tone; style?: React.CSSProperties; text?: string }> = ({ tone = 'cream', style, text = 'Reprezentare ilustrativă' }) => (
  <div style={{ fontFamily: B.f.sans, fontWeight: 400, fontSize: B.t.illustrative, color: tone === 'cream' ? B.c.charcoal : B.c.cream, ...style }}>{text}</div>
);

/** Full-screen scene (covers the camera). enter: 'cut' = instant on a cut, 'fade' = 300 ms, 'rise' = slides up. */
export const Scene: React.FC<{ start: number; end: number; tone?: Tone; enterMode?: 'cut' | 'fade' | 'rise'; exitMode?: 'cut' | 'fade'; children: React.ReactNode }> = ({ start, end, tone = 'navy', enterMode = 'cut', exitMode = 'cut', children }) => {
  const t = useT();
  if (t < start || t >= end) return null;
  const kin = enterMode === 'cut' ? 1 : p(t, start, start + 0.3);
  const kout = exitMode === 'cut' ? 1 : 1 - p(t, end - 0.3, end);
  const y = enterMode === 'rise' ? (1 - kin) * 1080 : 0;
  return (
    <AbsoluteFill style={{ background: tone === 'navy' ? B.c.navy : B.c.cream, opacity: enterMode === 'fade' ? Math.min(kin, kout) : kout, transform: `translateY(${y}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

/** SVG stroke that draws itself: k 0→1. Use pathLength=1 trick. */
export const Draw: React.FC<{ d: string; k: number; color?: string; width?: number; cap?: 'round' | 'butt'; fill?: string; style?: React.CSSProperties }> = ({ d, k, color = B.c.goldDark, width = 4, cap = 'round', fill = 'none', style }) => (
  <path d={d} fill={fill} stroke={color} strokeWidth={width} strokeLinecap={cap} strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.max(0, Math.min(1, k))} style={style} />
);

/** Lower-third (name card) — cream, left panel. */
export const LowerThird: React.FC<{ start: number; end: number; name: string; role: string; x?: number; y?: number }> = ({ start, end, name, role, x = 96, y = 688 }) => (
  <Card start={start} end={end} x={x} y={y} w={600} from="left" pad={28}>
    <Title size={40}>{name}</Title>
    <Label style={{ marginTop: 10 }}>{role}</Label>
  </Card>
);

/** Quote card on navy, Fraunces 60, gold quotes that draw in. */
export const QuoteCard: React.FC<{ start: number; end: number; x: number; y: number; w: number; text: string; from?: 'left' | 'right' }> = ({ start, end, x, y, w, text, from = 'left' }) => (
  <Card start={start} end={end} x={x} y={y} w={w} tone="navy" from={from} pad={40}>
    <div style={{ fontFamily: B.f.serif, fontVariationSettings: B.f.serifDisplay, fontSize: B.t.quote, lineHeight: 1.08, color: B.c.cream }}>
      <span style={{ color: B.c.gold }}>„</span>{text}<span style={{ color: B.c.gold }}>”</span>
    </div>
  </Card>
);

export const Logo: React.FC<{ variant?: 'full' | 'symbol'; width: number; style?: React.CSSProperties }> = ({ variant = 'full', width, style }) => (
  <Img src={staticFile(variant === 'full' ? 'logo_full.png' : 'logo_symbol.png')} style={{ width, height: 'auto', display: 'block', ...style }} />
);

/** The single CTA button (terracotta). Use ONLY in chapter 07. */
export const CtaButton: React.FC<{ k?: number; size?: number; style?: React.CSSProperties }> = ({ k = 1, size = 30, style }) => (
  <div style={{ display: 'inline-block', padding: '20px 36px', borderRadius: 999, background: B.c.terracotta, color: B.c.cream, fontFamily: B.f.sans, fontWeight: 600, fontSize: size, whiteSpace: 'nowrap', ...enter(k, 'up', 16), ...style }}>
    Programează-ți scanarea creierului
  </div>
);
