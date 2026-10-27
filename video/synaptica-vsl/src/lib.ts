// Animation + timing helpers. All public times are OUTPUT SECONDS (after the edit), converted to frames here.
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { B, FPS } from './brand';
import marks from './data/marks_out.json';

export const M = marks as Record<string, number>;   // key moments in output seconds (see data/marks_out.json)
export const f = (sec: number) => Math.round(sec * FPS);
export const ease = Easing.bezier(...B.m.ease);

/** 0→1 between output seconds a and b (eased, clamped). */
export const p = (t: number, a: number, b: number, e = ease) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });

/** Linear 0→1 (no easing) between a and b. */
export const lin = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Visibility window: fades in over `inS` after `start`, out over `outS` before `end`. */
export const win = (t: number, start: number, end: number, inS = B.m.in / FPS, outS = B.m.out / FPS) =>
  Math.min(p(t, start, start + inS), 1 - p(t, end - outS, end));

/** Current time in output seconds. */
export const useT = () => useCurrentFrame() / FPS + 0.0021;   // +2 ms: times are rounded to ms, cuts sit on frame boundaries

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export function mixColor(k: number, a: string, b: string) {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [A, C] = [h(a), h(b)];
  return `rgb(${A.map((v, i) => Math.round(v + (C[i] - v) * k)).join(',')})`;
}

/** Standard entrance: opacity + slide (px) from a side. */
export const enter = (k: number, from: 'left' | 'right' | 'up' | 'down' = 'up', dist = B.m.slide) => {
  const d = (1 - k) * dist;
  const tr = from === 'left' ? `translateX(${-d}px)` : from === 'right' ? `translateX(${d}px)` : from === 'up' ? `translateY(${d}px)` : `translateY(${-d}px)`;
  return { opacity: k, transform: tr } as const;
};
