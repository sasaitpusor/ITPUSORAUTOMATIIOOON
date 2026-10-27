// Chapter 06 — Pas cu pas (186.833 – 213.066 s). Times are OUTPUT seconds, synced to words in data/subs_out.json.
// 187.37 cream card left „Schimbarea cere timp și repetiție.” · 188.85 dotted path, dot runs it 3× on „repetiție” (190.61)
// 193.37 sage loop „pilot automat” · 194.45 the dot leaves the loop onto a new goldDark path „Un drum nou, exersat”
// 195.95 DotCounter 4×5 — dots fill 196.23 („20”) → 198.61 („repetări”) · „Program recomandat: aproximativ 20 de ședințe” + Note
// 201.8 (cut) NAVY scene: client clip „harta” left · title + 3 steps · two identical sheets laid side by side → 213.066 (cut)
import React from 'react';
import { B } from '../brand';
import { enter, lin, mix, mixColor, p, useT } from '../lib';
import { Body, Card, Draw, GoldBar, Illustrative, Label, Note, Scene, Title } from '../ui/kit';
import { VerticalClip } from '../ui/media';

export const NAVY: Array<[number, number]> = [[201.8, 213.066]];
export const HIDE_SUBS: Array<[number, number]> = [];

const T = {
  card: 187.3,        // „promit” 187.37
  path: 188.85,       // „creierul” 188.81
  cap: 189.21,        // „învață”
  rep: 190.61,        // „repetiție”
  pass: 0.24,         // one run along the path
  b53out: 193.0,
  loop: 193.37,       // „pilotul” 193.37 / „automat” 193.81
  loopDur: 0.6,
  branch: 194.45,     // dot leaves the loop
  branchDur: 0.6,
  b54out: 195.7,      // just before „trebuie” 195.79
  grid: 196.0,
  n20: 196.23,        // „20”
  sed: 197.17,        // „ședințe”
  repetari: 198.61,   // „repetări”
  note: 198.75,
  cut: 201.8,         // video cut → navy scene
  casca: 202.48,      // „casca” 202.51
  urmarim: 202.92,    // „urmărim”
  s1: 204.57,         // „scanarea”
  m1: 205.11,         // „măsurăm activitatea”
  sess: 205.95,
  s2: 206.93,         // „din nou”
  m2: 207.69,         // „măsurăm activitatea”
  seg2: 208.2,
  s3: 208.93,         // „final”
  side: 210.19,       // „hărți una lângă alta”
  vedem: 211.31,      // „vedem”
  end: 213.066,       // cut to chapter 07
};

// ─── curve helper: cubic Bézier with arc-length lookup (so the travelling dot matches <Draw>) ───
type Pt = [number, number];
const bez = (P: Pt[], u: number): Pt => {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
const curve = (P: Pt[]) => {
  const N = 160, pts: Pt[] = [], L: number[] = [0];
  for (let i = 0; i <= N; i++) {
    pts.push(bez(P, i / N));
    if (i) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const at = (k: number): Pt => {
    const s = Math.max(0, Math.min(1, k)) * L[N];
    let i = 1;
    while (i < N && L[i] < s) i++;
    const q = (s - L[i - 1]) / (L[i] - L[i - 1] || 1);
    return [mix(pts[i - 1][0], pts[i][0], q), mix(pts[i - 1][1], pts[i][1], q)];
  };
  const d = `M${P[0][0]} ${P[0][1]} C${P[1][0]} ${P[1][1]} ${P[2][0]} ${P[2][1]} ${P[3][0]} ${P[3][1]}`;
  return { at, d };
};

// Card-local coordinates (card x 96–696, y 160–720 → 600 × 560)
const CW = 600, CH = 560;
const HABIT: Pt[] = [[64, 400], [210, 300], [390, 500], [536, 380]];
const habit = curve(HABIT);
const habitRev = curve([...HABIT].reverse() as Pt[]);
const LOOP = { cx: 150, cy: 400, r: 70 };
const fresh = curve([[LOOP.cx, LOOP.cy - LOOP.r], [250, LOOP.cy - LOOP.r], [330, 290], [540, 290]]);
const CREAM = B.c.cream, GD = B.c.goldDark;

const Dot: React.FC<{ at: Pt; r?: number; color?: string; opacity?: number }> = ({ at, r = 10, color = GD, opacity = 1 }) => (
  <circle cx={at[0]} cy={at[1]} r={r} fill={color} opacity={opacity} />
);

// ─── B53 · „Se învață prin repetiție”: dotted path, a dot runs it 3× (there–back–there), the path turns solid ───
const Repetition: React.FC<{ t: number }> = ({ t }) => {
  const g = Math.min(p(t, T.path, T.path + 0.3), 1 - p(t, T.b53out, T.b53out + 0.3));
  if (g <= 0) return null;
  const reveal = p(t, T.path, T.path + 0.6);
  const passes = [0, 1, 2].map((i) => lin(t, T.rep + i * T.pass, T.rep + (i + 1) * T.pass));
  const j = Math.max(0, Math.min(2, Math.floor((t - T.rep) / T.pass)));
  const dotAt = j === 1 ? habitRev.at(passes[1]) : habit.at(passes[j]);
  const dotOp = Math.min(p(t, T.rep - 0.08, T.rep), 1 - p(t, T.rep + 3 * T.pass, T.rep + 3 * T.pass + 0.15));
  const nodeA = p(t, T.path, T.path + 0.25), nodeB = p(t, T.path + 0.45, T.path + 0.7);
  const capK = p(t, T.cap, T.cap + 0.35);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH, opacity: g }}>
      <Label style={{ position: 'absolute', left: 40, top: 196, ...enter(capK, 'up', 12) }}>Se învață prin repetiție</Label>
      <svg width={CW} height={CH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <defs>
          <clipPath id="ch06-reveal"><rect x={0} y={0} width={CW * reveal} height={CH} /></clipPath>
        </defs>
        <path d={habit.d} fill="none" stroke={GD} strokeWidth={6} strokeLinecap="round" strokeDasharray="0 15" clipPath="url(#ch06-reveal)" />
        {passes.map((k, i) => (
          <Draw key={i} d={i === 1 ? habitRev.d : habit.d} k={k} width={6} color={mixColor((i + 1) / 3, CREAM, GD)} />
        ))}
        <circle cx={HABIT[0][0]} cy={HABIT[0][1]} r={11} fill={CREAM} stroke={GD} strokeWidth={4} opacity={nodeA} />
        <circle cx={HABIT[3][0]} cy={HABIT[3][1]} r={11} fill={CREAM} stroke={GD} strokeWidth={4} opacity={nodeB} />
        {dotOp > 0 && <Dot at={dotAt} r={12} opacity={dotOp} />}
      </svg>
    </div>
  );
};

// ─── B54 · „pilot automat” loop → the dot leaves it on „un drum nou, exersat” ───
const NewPath: React.FC<{ t: number }> = ({ t }) => {
  const g = Math.min(p(t, T.loop - 0.05, T.loop + 0.1), 1 - p(t, T.b54out, T.b54out + 0.3));
  if (g <= 0) return null;
  const { cx, cy, r } = LOOP;
  const kLoop = lin(t, T.loop, T.loop + T.loopDur);
  const theta = t < T.loop + T.loopDur ? 2 * Math.PI * kLoop : 2 * Math.PI * (1 + lin(t, T.loop + T.loopDur, T.branch));
  const kNew = p(t, T.branch, T.branch + T.branchDur);
  const onLoop = t < T.branch;
  const dotAt: Pt = onLoop ? [cx + r * Math.sin(theta), cy - r * Math.cos(theta)] : fresh.at(kNew);
  const dotColor = onLoop ? B.c.sage : mixColor(p(t, T.branch, T.branch + 0.3), B.c.sage, GD);
  const loopOp = 1 - 0.35 * p(t, T.branch + 0.2, T.branch + 0.6);
  const endNode = p(t, T.branch + T.branchDur - 0.12, T.branch + T.branchDur + 0.08);
  const labK = p(t, 193.62, 193.95), newK = p(t, T.branch + 0.18, T.branch + 0.5);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH, opacity: g }}>
      <svg width={CW} height={CH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <g opacity={loopOp}>
          <Draw d={`M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`} k={kLoop} color={B.c.sage} width={6} />
        </g>
        <Draw d={fresh.d} k={kNew} color={GD} width={6} />
        <circle cx={540} cy={290} r={13} fill={GD} opacity={endNode} />
        {endNode < 1 && <Dot at={dotAt} r={12} color={dotColor} />}
      </svg>
      <Label style={{ position: 'absolute', left: 30, width: 240, top: 494, textAlign: 'center', opacity: labK * loopOp }}>Pilot automat</Label>
      <Body size={32} style={{ position: 'absolute', left: 160, width: 400, top: 212, textAlign: 'right', color: B.c.navy, ...enter(newK, 'up', 12) }}>
        Un drum nou, exersat
      </Body>
    </div>
  );
};

// ─── B55 · DotCounter 4 × 5: one dot = one session, they fill one by one between „20” and „repetări” ───
const COLS = 5, ROWS = 4, DR = 18, GAP = 64, GX = 58, GY = 214;
const DotCounter: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.grid) return null;
  const titleK = p(t, T.n20 - 0.05, T.n20 + 0.3), legK = p(t, T.sed - 0.05, T.sed + 0.3), noteK = p(t, T.note, T.note + 0.35);
  const step = (T.repetari - T.n20) / (COLS * ROWS - 1);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH }}>
      <Title size={40} style={{ position: 'absolute', left: 40, top: 62, width: 520, ...enter(titleK, 'up', 12) }}>
        Program recomandat:<br />aproximativ 20 de ședințe
      </Title>
      <svg width={CW} height={CH} style={{ position: 'absolute', left: 0, top: 0 }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const c = i % COLS, r = Math.floor(i / COLS), x = GX + c * GAP, y = GY + r * GAP;
          const kIn = p(t, T.grid + i * 0.012, T.grid + i * 0.012 + 0.25);
          const kFill = p(t, T.n20 + i * step, T.n20 + i * step + 0.14);
          return (
            <g key={i} opacity={kIn}>
              <circle cx={x} cy={y} r={DR - 1.5} fill="none" stroke={GD} strokeWidth={3} />
              {kFill > 0 && <circle cx={x} cy={y} r={DR * kFill} fill={GD} />}
            </g>
          );
        })}
        <circle cx={386} cy={GY + 1.5 * GAP} r={12} fill={GD} opacity={legK} />
      </svg>
      <Body size={28} style={{ position: 'absolute', left: 410, top: GY + 1.5 * GAP - 18, whiteSpace: 'nowrap', ...enter(legK, 'left', 12) }}>= o ședință</Body>
      <Note style={{ position: 'absolute', left: 40, top: 456, width: 520, ...enter(noteK, 'up', 12) }}>
        Numărul diferă<br />de la o persoană la alta.
      </Note>
    </div>
  );
};

const HabitCard: React.FC<{ t: number }> = ({ t }) => {
  const k1 = Math.min(p(t, T.card + 0.12, T.card + 0.45), 1 - p(t, T.b54out, T.b54out + 0.25));
  // path + loop are metaphors (no real data) → „Reprezentare ilustrativă” bottom-right of the card while they are shown
  const kIll = Math.min(p(t, T.path, T.path + 0.3), 1 - p(t, T.b54out, T.b54out + 0.3));
  return (
    <Card start={T.card} end={T.cut} x={96} y={160} w={CW} h={CH} from="left" pad={40} outS={0.01}>
      {k1 > 0 && (
        <Title size={40} style={{ position: 'absolute', left: 40, top: 62, width: 520, ...enter(k1, 'up', 12) }}>
          Schimbarea cere timp<br />și repetiție.
        </Title>
      )}
      <Repetition t={t} />
      <NewPath t={t} />
      {kIll > 0 && <Illustrative style={{ position: 'absolute', right: 36, bottom: 26, opacity: kIll }} />}
      <DotCounter t={t} />
    </Card>
  );
};

// ─── B56–B58 · navy scene: clip left · title · steps · two identical sheets side by side ───
const SX = 702, SR = 30;
const STEPS = [
  { n: '1', label: 'Scanare inițială', y: 340, at: T.s1 },
  { n: '2', label: 'Scanare de control', y: 520, at: T.s2 },
  { n: '3', label: 'Comparăm măsurătorile', y: 700, at: T.s3 },
];
const SW = 290, SHH = 208;                       // mini sheet size
const S1 = { x: 1180, y0: 262 }, S2 = { x: 1530, y0: 446 }, SY = 396;   // initial (cascade) → side by side
const rowY = (sy: number, r: number) => sy + 64 + r * 28;

const Sheet: React.FC<{ t: number; x: number; y: number; label: string; at: number; band: number; bandK: number }> = ({ t, x, y, label, at, band, bandK }) => {
  const k = p(t, at, at + 0.35);
  if (k <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: SW, height: SHH, borderRadius: 16, background: B.c.cream, ...enter(k, 'up', 16) }}>
      <Label style={{ position: 'absolute', left: 22, top: 16, fontSize: 20 }}>{label}</Label>
      <svg width={SW} height={SHH} style={{ position: 'absolute', left: 0, top: 0 }}>
        {Array.from({ length: 45 }, (_, i) => {
          const c = i % 9, r = Math.floor(i / 9);
          const kc = p(t, at + 0.15 + i * 0.011, at + 0.15 + i * 0.011 + 0.2);
          return <circle key={i} cx={33 + c * 28} cy={64 + r * 28} r={10} fill="none" stroke={GD} strokeWidth={2.5} opacity={kc} />;
        })}
        {bandK > 0 && <rect x={14} y={64 + band * 28 - 16} width={SW - 28} height={32} rx={16} fill="none" stroke={GD} strokeWidth={3} opacity={bandK} />}
      </svg>
    </div>
  );
};

const ScanScene: React.FC<{ t: number }> = ({ t }) => {
  const k1 = p(t, T.casca, T.casca + 0.35), k2 = p(t, T.urmarim, T.urmarim + 0.35);
  const kSide = p(t, T.side, T.side + 0.7);
  const y1 = mix(S1.y0, SY, kSide), y2 = mix(S2.y0, SY, kSide);
  // „vedem”: lens + row bands step through the 5 rows of both sheets in sync
  const lensK = p(t, T.vedem - 0.05, T.vedem + 0.25);
  const band = [0, 1, 2, 3].reduce((a, i) => a + p(t, T.vedem + 0.25 + i * 0.34, T.vedem + 0.25 + i * 0.34 + 0.24), 0);
  const ly = rowY(SY, band), lx = (S1.x + SW + S2.x) / 2;
  const sessLab = p(t, T.sess + 0.2, T.sess + 0.5);
  return (
    <Scene start={T.cut} end={T.end} tone="navy" enterMode="cut" exitMode="cut">
      <VerticalClip clip="harta" start={T.cut} dur={T.end - T.cut} clipFrom={0} x={120} y={72} w={432} h={768} />

      <GoldBar k={1} style={{ position: 'absolute', left: 672, top: 84, opacity: k1 }} />
      <Title tone="navy" size={56} style={{ position: 'absolute', left: 672, top: 104, whiteSpace: 'nowrap', ...enter(k1, 'up', 16) }}>Terapia cu casca:</Title>
      <Title tone="navy" size={56} style={{ position: 'absolute', left: 672, top: 166, whiteSpace: 'nowrap', ...enter(k2, 'up', 16) }}>măsurăm și comparăm</Title>

      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        {/* between scans: sessions (dotted, no number) */}
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={i} cx={SX} cy={STEPS[0].y + SR + 14 + i * ((STEPS[1].y - STEPS[0].y - 2 * SR - 28) / 6)} r={4.5} fill={B.c.gold}
            opacity={p(t, T.sess + i * 0.1, T.sess + i * 0.1 + 0.2)} />
        ))}
        <Draw d={`M${SX} ${STEPS[1].y + SR + 10} L${SX} ${STEPS[2].y - SR - 10}`} k={p(t, T.seg2, T.seg2 + 0.6)} color={B.c.gold} width={4} />
        {STEPS.map((s) => (
          <g key={s.n}>
            <Draw d={`M${SX} ${s.y - SR} A${SR} ${SR} 0 1 1 ${SX - 0.01} ${s.y - SR}`} k={p(t, s.at - 0.05, s.at + 0.3)} color={B.c.gold} width={4} />
            <circle cx={SX} cy={s.y} r={SR} fill={B.c.gold} opacity={p(t, s.at + 0.15, s.at + 0.4)} />
          </g>
        ))}
      </svg>
      {STEPS.map((s) => {
        const kf = p(t, s.at + 0.15, s.at + 0.4), kl = p(t, s.at, s.at + 0.35);
        return (
          <React.Fragment key={s.n}>
            <div style={{ position: 'absolute', left: SX - SR, top: s.y - SR, width: 2 * SR, height: 2 * SR, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: B.f.sans, fontWeight: 600, fontSize: 28, color: B.c.navy, opacity: kf }}>{s.n}</div>
            <Body tone="navy" size={30} style={{ position: 'absolute', left: 760, top: s.y - 19, whiteSpace: 'nowrap', ...enter(kl, 'left', 16) }}>{s.label}</Body>
          </React.Fragment>
        );
      })}
      <Label tone="navy" style={{ position: 'absolute', left: 760, top: (STEPS[0].y + STEPS[1].y) / 2 - 14, opacity: sessLab }}>Ședințe</Label>

      <Sheet t={t} x={S1.x} y={y1} label="Scanarea 1" at={T.m1} band={band} bandK={lensK} />
      <Sheet t={t} x={S2.x} y={y2} label="Scanarea 2" at={T.m2} band={band} bandK={lensK} />
      {lensK > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: lensK }}>
          <circle cx={lx - 4} cy={ly - 4} r={16} fill="none" stroke={B.c.gold} strokeWidth={4} />
          <path d={`M${lx + 6} ${ly + 6} L${lx + 17} ${ly + 17}`} stroke={B.c.gold} strokeWidth={5} strokeLinecap="round" />
        </svg>
      )}

      <Illustrative tone="navy" style={{ position: 'absolute', right: 96, top: 800, opacity: p(t, T.m1, T.m1 + 0.35) }} />
    </Scene>
  );
};

const Ch06: React.FC = () => {
  const t = useT();
  if (t < 186.5 || t >= T.end) return null;
  return (
    <>
      <HabitCard t={t} />
      <ScanScene t={t} />
    </>
  );
};
export default Ch06;
