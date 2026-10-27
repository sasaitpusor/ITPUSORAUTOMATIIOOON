// Chapter 04 — „Nu e lipsă de voință” · output 125.5–144.967 s · beats B34–B38. Times are OUTPUT seconds.
//  125.5–128.0  pill 04 (core) on the 110 % frame — nothing else, top-left stays free.
//  B35 128.0–136.467  CompareCard (cream, left x 96–696): „Vrei… / Dar…”. Each row = wish → what actually happens,
//                     joined by a gold arrow whose line carries the idea (restless · scattered · spiking), drawn on the word.
//  B36 136.467–138.2  camera push only (CameraTrack) — a breath, no graphics.
//  B37 138.2–140.633  QuoteCard (navy, left): „Nu este vina ta.” word by word, gold quotes wipe in, „vina” underlined.
//  B38 140.673–144.966 PanelCard (cream, right): 5 small waves in proportion; on „rămas” ONE wave (Beta) grows too strong;
//                     „Un dezechilibru între frecvențe” → „Un tipar care se poate antrena” (+ loop icon). Illustrative.
// Her face (FRONTAL) stays at x ≈ 787–1100 through the zooms; nothing here crosses x 696–1224 or y > 840.
import React from 'react';
import { B } from '../brand';
import { enter, mix, mixColor, p, useT } from '../lib';
import { Card, Draw, Illustrative, Label } from '../ui/kit';
import { BANDS, WaveGlyph } from '../ui/media';
import subs from '../data/subs_out.json';

export const NAVY: Array<[number, number]> = [];
export const HIDE_SUBS: Array<[number, number]> = [];

// ─── word sync ──────────────────────────────────────────────────────────────
const WORDS = (subs as { words: { t: string; s: number }[] }).words;
const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:„”"…–—]/g, '').trim();
/** Onset of word `w` closest to `near` (falls back to `near`). */
const wt = (w: string, near: number) => {
  let best = near, d = 1.0;
  for (const x of WORDS) { const dd = Math.abs(x.s - near); if (norm(x.t) === w && dd < d) { d = dd; best = x.s; } }
  return best;
};

const T = {
  cardIn: wt('vrei', 128.09) - 0.1,
  sa1: wt('să', 129.03), foiesti: wt('foiești', 129.83),
  cut1: 130.597, dar2: wt('dar', 131.89), fuge: wt('fuge', 132.58),
  fii: wt('fii', 134.39), dar3: wt('dar', 134.91), explodezi: wt('explodezi', 135.03), orice: wt('orice', 135.79),
  cut2: 136.467,
  quoteIn: 138.2, nu: Math.min(wt('nu', 138.42), wt('este', 138.41)), vina: wt('vina', 138.57), ta: wt('ta', 138.83), quoteOut: 140.633,
  poate: wt('poate', 140.67), creierul: wt('creierul', 141.33), ramas: wt('rămas', 142.37), blocat: wt('blocat', 142.67),
  frecventa: wt('frecvență', 143.73), end: 144.966,
};

const sans = (size: number, color: string, weight: 400 | 600 = 600): React.CSSProperties =>
  ({ fontFamily: B.f.sans, fontWeight: weight, fontSize: size, lineHeight: 1.25, color });
const serif = (size: number, color: string): React.CSSProperties =>
  ({ fontFamily: B.f.serif, fontVariationSettings: size >= 56 ? B.f.serifDisplay : B.f.serifText, fontWeight: 400, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.01em', color });

// ═══ B35 · CompareCard ═══════════════════════════════════════════════════════
// content box (inside pad 36): 528 wide. Columns: wish 0–196 · arrow 206–278 · reality 288–528.
const CW = 528, COL_ARROW = 206, COL_BUT = 288;
// Arrow glyphs (72 × 40, centre line y 20). Each = list of strokes drawn one after the other.
const HEAD = 'M63 12.5 L71 20 L63 27.5';
const GLYPHS: string[][] = [
  // restless: starts straight, then tosses — „te foiești”
  ['M2 20 L16 20 C19 20 20 11 24 11 C28 11 28 29 32 29 C36 29 36 11 40 11 C44 11 44 29 48 29 C52 29 52 20 56 20 L70 20', HEAD],
  // scattered: one line splitting into three — „mintea îți fuge în 10 părți”
  ['M2 20 L34 20', 'M34 20 L64 5', 'M34 20 L68 20', 'M34 20 L64 35'],
  // spiking: calm line with one sudden peak — „explodezi”
  ['M2 20 L24 20 L31 2 L39 36 L45 20 L70 20', HEAD],
];
const DOTS: Array<[number, number]> = [[64, 5], [68, 20], [64, 35]];   // ends of the scattered branches

type Row = { want: string; but: string; inAt: number; arrowAt: number; arrowDur: number; butAt: number };
const ROWS: Row[] = [
  { want: 'să dormi', but: 'somn greu\nde prins', inAt: T.sa1 - 0.05, arrowAt: T.foiesti - 0.12, arrowDur: 0.5, butAt: T.foiesti },
  { want: 'să te concentrezi', but: 'concentrare\ncare fuge', inAt: T.cut1, arrowAt: T.dar2, arrowDur: 0.75, butAt: T.fuge },
  { want: 'să fii calm', but: 'reacții prea mari\nla stres', inAt: T.fii - 0.05, arrowAt: T.dar3 - 0.05, arrowDur: 0.5, butAt: T.explodezi },
];
const HEAD_H = 50, ROW0 = HEAD_H + 34, ROW_GAP = 120;

const ArrowGlyph: React.FC<{ i: number; k: number }> = ({ i, k }) => {
  const parts = GLYPHS[i];
  // the first stroke takes most of the time; the rest (head / branches) follow
  const seg = (j: number) => (j === 0 ? p(k, 0, i === 1 ? 0.45 : 0.78) : p(k, i === 1 ? 0.4 + (j - 1) * 0.12 : 0.74, i === 1 ? 0.78 + (j - 1) * 0.1 : 1));
  return (
    <svg width={72} height={40} viewBox="0 0 72 40" style={{ display: 'block', overflow: 'visible' }}>
      {parts.map((d, j) => <Draw key={j} d={d} k={seg(j)} color={B.c.goldDark} width={3.5} />)}
      {i === 1 && DOTS.map(([x, y], j) => (
        <circle key={j} cx={x} cy={y} r={3.6} fill={B.c.goldDark} opacity={p(k, 0.8 + j * 0.06, 0.92 + j * 0.06)} />
      ))}
    </svg>
  );
};

const CompareCard: React.FC<{ t: number }> = ({ t }) => {
  const kHead1 = p(t, T.cardIn + 0.1, T.cardIn + 0.45);
  const kHead2 = p(t, ROWS[0].arrowAt, ROWS[0].arrowAt + 0.35);
  const kRule = p(t, T.cardIn + 0.15, T.cardIn + 0.75);
  // the card grows by one row each time a new wish is told (ease-out, finishes as the text lands)
  const n = ROWS.reduce((a, r) => a + p(t, r.inAt - 0.12, r.inAt + 0.28), 0);
  const H = 64 + ROW_GAP * n;
  return (
    <Card start={T.cardIn} end={T.cut2} x={96} y={160} w={600} from="left" inS={0.35} outS={0.22}>
      <div style={{ position: 'relative', width: CW, height: H }}>
        {/* header */}
        <div style={{ position: 'absolute', left: 0, top: 0, ...serif(44, B.c.sage), ...enter(kHead1, 'up', 12) }}>Vrei…</div>
        <div style={{ position: 'absolute', left: COL_BUT, top: 0, ...serif(44, B.c.charcoal), ...enter(kHead2, 'left', 16) }}>Dar…</div>
        <svg width={CW} height={4} style={{ position: 'absolute', left: 0, top: HEAD_H + 10, overflow: 'visible' }}>
          <Draw d={`M1 2 L${CW - 1} 2`} k={kRule} color={B.c.sageLine} width={2} />
        </svg>
        {/* rows */}
        {ROWS.map((r, i) => {
          const y = ROW0 + i * ROW_GAP;
          const kIn = p(t, r.inAt, r.inAt + 0.35);
          const kArrow = p(t, r.arrowAt, r.arrowAt + r.arrowDur);
          const kBut = p(t, r.butAt, r.butAt + 0.35);
          // previous rows step back while the next one is told; all three return together at the end („orice”)
          const back = i < 2 ? p(t, ROWS[i + 1].inAt, ROWS[i + 1].inAt + 0.4) : 0;
          const dim = 1 - 0.4 * back * (1 - p(t, T.orice, T.orice + 0.4));
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: y, width: CW, height: ROW_GAP - 20, opacity: dim }}>
              {i > 0 && (
                <svg width={CW} height={4} style={{ position: 'absolute', left: 0, top: -22, overflow: 'visible' }}>
                  <Draw d={`M1 2 L${CW - 1} 2`} k={p(t, r.inAt - 0.05, r.inAt + 0.45)} color={B.c.sageLine} width={1.5} />
                </svg>
              )}
              <div style={{ position: 'absolute', left: 0, top: 0, width: COL_ARROW - 10, ...sans(30, B.c.navy), ...enter(kIn, 'up', 14) }}>{r.want}</div>
              <div style={{ position: 'absolute', left: COL_ARROW, top: -1 }}><ArrowGlyph i={i} k={kArrow} /></div>
              <div style={{ position: 'absolute', left: COL_BUT, top: 0, width: CW - COL_BUT, ...sans(30, B.c.charcoal, 400), whiteSpace: 'pre-line', ...enter(kBut, 'left', 16) }}>{r.but}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ═══ B37 · QuoteCard „Nu este vina ta.” ═════════════════════════════════════
const Word: React.FC<{ k: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ k, children, style }) => (
  <span style={{ display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 10}px)`, ...style }}>{children}</span>
);
/** Gold quote glyph that wipes in (left → right). */
const QuoteMark: React.FC<{ k: number; ch: string }> = ({ k, ch }) => (
  <span style={{ display: 'inline-block', color: B.c.gold, clipPath: `inset(0 ${((1 - k) * 100).toFixed(1)}% 0 0)` }}>{ch}</span>
);

const VinaQuote: React.FC<{ t: number }> = ({ t }) => {
  const kQ1 = p(t, T.quoteIn + 0.08, T.nu + 0.15);
  const kNu = p(t, T.nu - 0.04, T.nu + 0.26);
  const kVina = p(t, T.vina - 0.04, T.vina + 0.26);
  const kTa = p(t, T.ta - 0.04, T.ta + 0.26);
  const kQ2 = p(t, T.ta + 0.14, T.ta + 0.42);
  const kLine = p(t, T.nu + 0.12, T.nu + 0.55);   // the emphasis sits on „Nu” — the message is „it is NOT your fault”
  return (
    <Card start={T.quoteIn} end={T.quoteOut} x={96} y={336} w={540} tone="navy" from="left" pad={44} inS={0.3} outS={0.2}>
      <div style={{ ...serif(B.t.quote, B.c.cream), lineHeight: 1.12, paddingBottom: 6 }}>
        <div style={{ whiteSpace: 'nowrap' }}>
          <QuoteMark k={kQ1} ch="„" />
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <Word k={kNu}>Nu</Word>
            <span style={{ position: 'absolute', left: 2, right: 2, bottom: 2, height: 4, borderRadius: 2, background: B.c.gold, transform: `scaleX(${kLine})`, transformOrigin: 'left center' }} />
          </span>{' '}
          <Word k={kNu}>este</Word>{' '}<Word k={kVina}>vina</Word>{' '}
          <Word k={kTa}>ta.</Word><QuoteMark k={kQ2} ch="”" />
        </div>
      </div>
    </Card>
  );
};

// ═══ B38 · PanelCard with mini WaveRow — one wave too strong ═══════════════
const WC = { w: 92, h: 170, gap: 17, top: 52 };
const CYC = [0.75, 1.25, 2, 3, 4.5];               // slow → fast (as in ch03's mini row)
const SPEED = [0.22, 0.34, 0.5, 0.8, 1.2];
const AMP = [0.3, 0.27, 0.24, 0.2, 0.17];          // their own amplitudes, never equal (fractions of the 150 px wave box)
const STRONG = 3;                                  // Beta
const WAVE_H = 150;
const SAGE40 = [78, 110, 96, 0.4], GOLDDARK = [159, 138, 63, 1];   // B.c.sageLine → B.c.goldDark
const rgba = (k: number, a: number[], b: number[]) => `rgba(${[0, 1, 2].map((j) => Math.round(mix(a[j], b[j], k))).join(',')},${mix(a[3], b[3], k).toFixed(3)})`;

const MiniWaves: React.FC<{ t: number }> = ({ t }) => {
  const kImb = p(t, T.ramas, T.ramas + 0.3);
  return (
    <>
      {BANDS.map((b, i) => {
        const kc = p(t, T.poate + 0.1 + i * 0.06, T.poate + 0.4 + i * 0.06);
        const kDraw = p(t, T.poate + 0.3 + i * 0.1, T.poate + 0.8 + i * 0.1);
        const s = i === STRONG ? kImb : 0;
        const amp = mix(AMP[i], 0.5, s);
        const others = i === STRONG ? 1 : 1 - 0.4 * kImb;
        return (
          <div key={b.name} style={{ position: 'absolute', left: i * (WC.w + WC.gap), top: WC.top, width: WC.w, opacity: kc * others }}>
            <div style={{ position: 'relative', width: WC.w, height: WC.h, boxSizing: 'border-box', borderRadius: 12,
              border: `${mix(2, 3, s)}px solid ${rgba(s, SAGE40, GOLDDARK)}`,
              background: `rgba(205,179,96,${(0.12 * s).toFixed(3)})` }}>
              <div style={{ position: 'absolute', left: (WC.w - 68) / 2 - mix(2, 3, s), top: (WC.h - WAVE_H) / 2 - mix(2, 3, s) }}>
                <WaveGlyph w={68} h={WAVE_H} cycles={CYC[i]} amp={amp} t={t} speed={SPEED[i]} k={kDraw} color={B.c.goldDark} width={mix(3, 4, s)} />
              </div>
            </div>
            <div style={{ marginTop: 10, textAlign: 'center', ...sans(24, i === STRONG ? mixColor(s, B.c.sage, B.c.navy) : B.c.sage) }}>{b.name}</div>
          </div>
        );
      })}
    </>
  );
};

// loop arrow (48 × 48): repetition = training
const LOOP = ['M37.9 32 A16 16 0 1 1 32 10.1', 'M22.4 11.6 L32 10.1 L28.6 1.2'];

const BalancePanel: React.FC<{ t: number }> = ({ t }) => {
  const kTitle = p(t, T.blocat - 0.04, T.blocat + 0.32);
  const kTrain = p(t, T.frecventa - 0.04, T.frecventa + 0.32);
  const kLoop = p(t, T.frecventa, T.frecventa + 0.6);
  const kGrow = p(t, T.blocat - 0.12, T.blocat + 0.3);   // compact (waves only) → room for the two lines
  return (
    <Card start={T.poate} end={T.end} x={1224} y={160} w={600} from="right" inS={0.32} outS={0.2}>
      <div style={{ position: 'relative', width: 528, height: mix(316, 556, kGrow) }}>
        <Label>Cele 5 unde</Label>
        <MiniWaves t={t} />
        <div style={{ position: 'absolute', left: 0, top: 300, width: 528, ...serif(44, B.c.navy), ...enter(kTitle, 'up', 16) }}>
          Un dezechilibru<br />între frecvențe
        </div>
        <div style={{ position: 'absolute', left: 0, top: 418, display: 'flex', alignItems: 'center', gap: 18, ...enter(kTrain, 'up', 16) }}>
          <svg width={48} height={48} viewBox="0 0 48 48" style={{ display: 'block', overflow: 'visible', flex: 'none' }}>
            {LOOP.map((d, j) => <Draw key={j} d={d} k={j === 0 ? p(kLoop, 0, 0.8) : p(kLoop, 0.75, 1)} color={B.c.goldDark} width={3.5} />)}
          </svg>
          <div style={sans(30, B.c.charcoal)}>Un tipar care<br />se poate antrena</div>
        </div>
        <Illustrative style={{ position: 'absolute', right: 0, bottom: 0, whiteSpace: 'nowrap' }} />
      </div>
    </Card>
  );
};

const Ch: React.FC = () => {
  const t = useT();
  if (t < 125.5 || t > 145) return null;
  return (
    <>
      <CompareCard t={t} />
      <VinaQuote t={t} />
      <BalancePanel t={t} />
    </>
  );
};
export default Ch;
