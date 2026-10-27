// Waves (illustrative) and the client's vertical B-roll clips.
import React from 'react';
import { OffthreadVideo, Sequence, staticFile } from 'remotion';
import { B, FPS } from '../brand';
import { f } from '../lib';

/** Animated, stylised sine wave (illustrative — never real data). cycles = how many periods fit in w. */
export const WaveGlyph: React.FC<{ w: number; h: number; cycles: number; amp?: number; t: number; speed?: number; k?: number; color?: string; width?: number }> = ({ w, h, cycles, amp = 0.38, t, speed = 0.6, k = 1, color = B.c.gold, width = 4 }) => {
  const pts: string[] = [];
  const n = Math.max(48, Math.round(cycles * 24));
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const y = h / 2 - Math.sin((i / n) * cycles * Math.PI * 2 - t * speed * Math.PI * 2) * h * amp;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <path d={pts.join(' ')} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.max(0, Math.min(1, k))} />
    </svg>
  );
};

/** The 5 bands, slow → fast (wave names as agreed: delta · teta · alfa · beta · gama). */
export const BANDS = [
  { name: 'Delta', role: 'somn profund', cycles: 1.5 },
  { name: 'Teta', role: 'relaxare profundă', cycles: 2.5 },
  { name: 'Alfa', role: 'calm și liniște', cycles: 4 },
  { name: 'Beta', role: 'gândire, concentrare', cycles: 7 },
  { name: 'Gama', role: 'integrarea informațiilor', cycles: 11 },
] as const;

/** Client B-roll (filmed vertically, 1080×1920): plays `clip` from `clipFrom` s, starting at output time `start`, for `dur` s, inside a portrait card. */
export const VerticalClip: React.FC<{ clip: 'cabluri' | 'harta' | 'neurofeedback'; start: number; dur: number; clipFrom: number; x: number; y: number; w: number; h: number; radius?: number; style?: React.CSSProperties }> = ({ clip, start, dur, clipFrom, x, y, w, h, radius = B.r.card, style }) => (
  <Sequence from={f(start)} durationInFrames={Math.max(1, f(dur))} layout="none">
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: radius, overflow: 'hidden', background: B.c.navy, ...style }}>
      <OffthreadVideo src={staticFile(`broll_${clip}.mp4`)} startFrom={Math.round(clipFrom * FPS)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  </Sequence>
);
