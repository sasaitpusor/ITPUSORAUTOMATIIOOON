// Core layers: video with the virtual camera, chapter pills, subtitles, font gate.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Easing, Img, OffthreadVideo, continueRender, delayRender, interpolate, staticFile } from 'remotion';
import { B, FPS, VIDEO_END } from '../brand';
import { enter, p, useT } from '../lib';
import camera from '../data/camera_out.json';
import chapters from '../data/chapters_out.json';
import subs from '../data/subs_out.json';

// ─── Video + CameraTrack (zoom alternation hides jump cuts; anchors on the face) ───
type Cam = { s: number; e: number; f: number; t: number; ax: number; ay: number };
const CAM = camera as Cam[];
export const cameraAt = (t: number) => {
  const c = CAM.find((k) => t >= k.s - 0.0021 && t < k.e - 0.0021) ?? CAM[CAM.length - 1];   // tolerance: segment times are rounded to ms, cuts sit on frame boundaries
  const k = c.f === c.t ? 0 : interpolate(t, [c.s, c.e], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: c.e - c.s < 1 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.sin) });
  return { scale: c.f + (c.t - c.f) * k, ax: c.ax, ay: c.ay };
};
// Soft colour patches over leftover monitor UI (source-frame coordinates, inside the camera transform; colour sampled from the bar).
const PATCHES = [{ s: 95.067, e: 96.70, x: 1760, y: 748, w: 260, h: 72, color: 'rgb(84,95,107)' }];
export const Footage: React.FC = () => {
  const t = useT();
  if (t >= VIDEO_END + 0.5) return null;
  const { scale, ax, ay } = cameraAt(t);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${ax}px ${ay}px` }}>
      <OffthreadVideo src={staticFile('vsl.mp4')} muted />
      {PATCHES.filter((q) => t >= q.s && t < q.e).map((q, i) => (
        <div key={i} style={{ position: 'absolute', left: q.x, top: q.y, width: q.w, height: q.h, background: q.color, borderRadius: 20, filter: 'blur(10px)' }} />
      ))}
    </AbsoluteFill>
  );
};

// ─── Chapter pills (02–07): symbol + "NN · Title", 3 s at each chapter start ───
const PILLS = (chapters as { n: string; title: string; start: number }[]).filter((c) => Number(c.n) >= 2);
export const ChapterPills: React.FC = () => {
  const t = useT();
  const c = PILLS.find((k) => t >= k.start && t < k.start + 3.0);
  if (!c) return null;
  const k = Math.min(p(t, c.start, c.start + 0.3), 1 - p(t, c.start + 2.7, c.start + 3.0));
  return (
    <div style={{ position: 'absolute', left: B.x.margin, top: B.y.top, height: 56, padding: '0 26px 0 14px', borderRadius: B.r.pill,
      background: B.c.navy, display: 'flex', alignItems: 'center', gap: 14, ...enter(k, 'left') }}>
      <Img src={staticFile('logo_symbol.png')} style={{ height: 36, width: 'auto' }} />
      <div style={{ fontFamily: B.f.sans, fontWeight: 600, fontSize: B.t.label, letterSpacing: B.t.labelTracking, textTransform: 'uppercase', color: B.c.cream, whiteSpace: 'nowrap' }}>
        <span style={{ color: B.c.gold }}>{c.n} · </span>{c.title}
      </div>
    </div>
  );
};

// ─── Subtitles: Inter Semibold 46, cream on navy band; band transparent over navy full-screen scenes ───
type Word = { t: string; s: number; e: number; a: boolean };
const PH = (subs as { phrases: Word[][] }).phrases;
export const Subtitles: React.FC<{ navy: Array<[number, number]>; hide: Array<[number, number]> }> = ({ navy, hide }) => {
  const t = useT();
  if (t >= VIDEO_END || hide.some(([a, b]) => t >= a && t < b)) return null;
  const i = PH.findIndex((ph, j) => {
    const next = PH[j + 1];
    const end = next ? Math.min(next[0].s, ph[ph.length - 1].e + 0.9) : ph[ph.length - 1].e + 0.6;
    return t >= ph[0].s - 0.04 && t < end;
  });
  if (i < 0) return null;
  const ph = PH[i];
  const onNavy = navy.some(([a, b]) => t >= a && t < b);
  return (
    <div style={{ position: 'absolute', left: 260, width: 1400, bottom: 1080 - B.y.subBottom, textAlign: 'center' }}>
      <span style={{ fontFamily: B.f.sans, fontWeight: 600, fontSize: B.t.sub, lineHeight: 1.36, color: B.c.cream,
        background: onNavy ? 'transparent' : B.c.subBand, padding: '6px 24px', borderRadius: B.r.sub,
        boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } as React.CSSProperties}>
        {ph.map((w, j) => (
          <React.Fragment key={j}>
            <span style={{ whiteSpace: 'nowrap', color: w.a ? B.c.gold : B.c.cream, opacity: t >= w.s - 0.03 ? 1 : 0.45 }}>{w.t}</span>
            {j < ph.length - 1 ? ' ' : ''}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
};

// ─── Font gate (diacritics) ───
export const useFonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const test = 'ĂÂÎȘȚ ăâîșț „”–';
    Promise.all([
      document.fonts.load(`400 60px 'Fraunces Variable'`, test),
      document.fonts.load(`400 30px 'Inter'`, test),
      document.fonts.load(`600 46px 'Inter'`, test),
    ]).then(() => document.fonts.ready).then(() => continueRender(h));
  }, [h]);
};

export const FPS_ = FPS;
