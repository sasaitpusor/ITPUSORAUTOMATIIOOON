// Real EEG maps (clean, rectified JPEG exports; client consent confirmed; names removed).
// Grid: 5 rows × 9 columns. Row 0 = 1–9 Hz (slow) … row 4 = 37–45 Hz (fast). Col 0..8 left→right.
// Real map colours (blue/green/red) are allowed ONLY as real imagery — never redraw them.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { B } from '../brand';
import { Draw } from './kit';
import maps from '../data/maps.json';

export type MapName = 'map1_alerta' | 'map2_albastru' | 'map3_rosu_jos' | 'map4_obosit' | 'map5_echilibru';
type Meta = { w: number; h: number; r: number; c: number[][][] };
export const MAPS = maps as Record<MapName, Meta>;
export type View = { x0: number; y0: number; x1: number; y1: number };   // rectangle in PNG pixels
export type Box = { x: number; y: number; w: number; h: number };        // rectangle on screen (1920×1080)

/** Full view of a map, or the band of rows r0..r1 (inclusive) with padding. */
export const fullView = (n: MapName): View => ({ x0: 0, y0: 0, x1: MAPS[n].w, y1: MAPS[n].h });
export const rowsView = (n: MapName, r0: number, r1: number, padR = 1.25): View => {
  const m = MAPS[n], c = m.c;
  const yTop = c[r0][0][1] - m.r * padR, yBot = c[r1][0][1] + m.r * (padR + 0.45);
  const xL = c[0][0][0] - m.r * padR, xR = c[0][8][0] + m.r * padR;
  return { x0: xL, y0: yTop, x1: xR, y1: yBot };
};
export const lerpView = (a: View, b: View, k: number): View => ({ x0: a.x0 + (b.x0 - a.x0) * k, y0: a.y0 + (b.y0 - a.y0) * k, x1: a.x1 + (b.x1 - a.x1) * k, y1: a.y1 + (b.y1 - a.y1) * k });

/** Geometry helper: where a circle (row, col) lands on screen for a given box + view (fit = contain, centred). */
export const geom = (n: MapName, box: Box, view: View = fullView(n)) => {
  const s = Math.min(box.w / (view.x1 - view.x0), box.h / (view.y1 - view.y0));
  const ox = box.x + (box.w - (view.x1 - view.x0) * s) / 2 - view.x0 * s;
  const oy = box.y + (box.h - (view.y1 - view.y0) * s) / 2 - view.y0 * s;
  const m = MAPS[n];
  const pos = (row: number, col: number) => ({ x: ox + m.c[row][col][0] * s, y: oy + m.c[row][col][1] * s });
  return { s, ox, oy, r: m.r * s, pos, imgW: m.w * s, imgH: m.h * s };
};

/** The map image clipped to `box`, showing `view`. Optional opacity mask per circle via `reveal(row,col)→0..1`. */
export const MapImage: React.FC<{ name: MapName; box: Box; view?: View; radius?: number; bg?: string; reveal?: (row: number, col: number) => number; style?: React.CSSProperties }> = ({ name, box, view, radius = 16, bg = '#F7F7F7', reveal, style }) => {
  const g = geom(name, box, view ?? fullView(name));
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', borderRadius: radius, background: bg, ...style }}>
      <Img src={staticFile(`maps/${name}.png`)} style={{ position: 'absolute', left: g.ox - box.x, top: g.oy - box.y, width: g.imgW, height: g.imgH }} />
      {reveal && (
        <svg width={box.w} height={box.h} style={{ position: 'absolute', left: 0, top: 0 }}>
          {[0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
            const k = reveal(r, c); if (k >= 1) return null;
            const q = g.pos(r, c);
            return <circle key={`${r}-${c}`} cx={q.x - box.x} cy={q.y - box.y} r={g.r * 1.06} fill={bg} opacity={1 - k} />;
          }))}
        </svg>
      )}
    </div>
  );
};

/** Navy bracket on the left of rows r0..r1 (4 px, round caps) that draws itself; label to its left/right. */
export const RowBracket: React.FC<{ name: MapName; box: Box; view?: View; r0: number; r1: number; k: number; side?: 'left' | 'right'; color?: string }> = ({ name, box, view, r0, r1, k, side = 'left', color = B.c.navy }) => {
  const g = geom(name, box, view ?? fullView(name));
  const a = g.pos(r0, side === 'left' ? 0 : 8), b = g.pos(r1, side === 'left' ? 0 : 8);
  const dx = side === 'left' ? -g.r * 1.35 : g.r * 1.35, hook = side === 'left' ? 14 : -14;
  const x = a.x + dx, y0 = a.y - g.r * 0.95, y1 = b.y + g.r * 0.95;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      <Draw d={`M${x + hook} ${y0} L${x} ${y0} L${x} ${y1} L${x + hook} ${y1}`} k={k} color={color} width={4} />
    </svg>
  );
};

/** Navy outline around rows r0..r1 (rounded rect). */
export const RowOutline: React.FC<{ name: MapName; box: Box; view?: View; r0: number; r1: number; k: number; c0?: number; c1?: number; color?: string }> = ({ name, box, view, r0, r1, k, c0 = 0, c1 = 8, color = B.c.navy }) => {
  const g = geom(name, box, view ?? fullView(name));
  const a = g.pos(r0, c0), b = g.pos(r1, c1);
  const x0 = a.x - g.r * 1.18, y0 = a.y - g.r * 1.12, x1 = b.x + g.r * 1.18, y1 = b.y + g.r * 1.5, rr = 18;
  const d = `M${x0 + rr} ${y0} H${x1 - rr} Q${x1} ${y0} ${x1} ${y0 + rr} V${y1 - rr} Q${x1} ${y1} ${x1 - rr} ${y1} H${x0 + rr} Q${x0} ${y1} ${x0} ${y1 - rr} V${y0 + rr} Q${x0} ${y0} ${x0 + rr} ${y0} Z`;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      <Draw d={d} k={k} color={color} width={4} />
    </svg>
  );
};

/** Navy ring around one circle. */
export const CircleRing: React.FC<{ name: MapName; box: Box; view?: View; row: number; col: number; k: number; color?: string }> = ({ name, box, view, row, col, k, color = B.c.navy }) => {
  const g = geom(name, box, view ?? fullView(name));
  const q = g.pos(row, col), r = g.r * 1.16;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      <Draw d={`M${q.x} ${q.y - r} a${r} ${r} 0 1 1 -0.01 0`} k={k} color={color} width={4} />
    </svg>
  );
};

/** A single real circle cropped from a map (for legends / samples). */
export const CircleSample: React.FC<{ name: MapName; row: number; col: number; x: number; y: number; d: number; style?: React.CSSProperties }> = ({ name, row, col, x, y, d, style }) => {
  const m = MAPS[name]; const [cx, cy] = m.c[row][col]; const s = d / (m.r * 2.04);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: d, height: d, borderRadius: '50%', overflow: 'hidden', ...style }}>
      <Img src={staticFile(`maps/${name}.png`)} style={{ position: 'absolute', left: -(cx - m.r * 1.02) * s, top: -(cy - m.r * 1.02) * s, width: m.w * s, height: m.h * s }} />
    </div>
  );
};
