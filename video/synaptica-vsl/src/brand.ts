// ─── Synaptica brand tokens (Manual de brand v1, oct. 2026) — VSL 16:9 ─────
import edl from './data/edl.json';

export const W = 1920, H = 1080, FPS = 30;
export const TOTAL_FRAMES = edl.total_frames as number;          // video + 4.5 s end card
export const VIDEO_END = (edl.out_video_frames as number) / FPS;  // 225.2 s — last spoken frame

export const B = {
  c: {
    navy: '#0E1D33', gold: '#CDB360', goldDark: '#9F8A3F', cream: '#FAF7F1',
    sage: '#4E6E60', terracotta: '#C1633B', charcoal: '#3B3631',
    subBand: 'rgba(14,29,51,0.72)',
    sageLine: 'rgba(78,110,96,0.40)',
  },
  f: {
    serif: "'Fraunces Variable', serif",
    sans: "'Inter', sans-serif",
    serifDisplay: '"opsz" 144, "SOFT" 0, "WONK" 0',
    serifText: '"SOFT" 0, "WONK" 0',
  },
  // type scale (px at 1920×1080)
  t: {
    sceneTitle: 60, cardTitle: 44, quote: 60, body: 34, bodySmall: 30,
    label: 24, labelTracking: '0.12em', note: 30, illustrative: 24, sub: 46,
  },
  r: { card: 24, pill: 28, sub: 16 },
  // layout grid (px). Rebeca's face sits around x 760–1150, y 140–600 in FRONTAL shots.
  x: { margin: 96, leftPanel: [96, 696] as const, rightPanel: [1224, 1824] as const, max: 1824 },
  y: { top: 56, panelTop: 160, panelBottom: 820, subTop: 860, subBottom: 960 },
  // motion
  m: { in: 9, out: 7, slide: 24, ease: [0.22, 1, 0.36, 1] as const },
};
