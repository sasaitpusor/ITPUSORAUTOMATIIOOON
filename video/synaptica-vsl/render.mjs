// Usage:
//   node render.mjs sheet <name> <sec> [sec...]   → out/<name>.jpg contact sheet (half-res stills, 4 per row, timestamps burned in)
//   node render.mjs stills <sec> [sec...]         → out/still_<frame>.png (SCALE env, default 0.5)
//   node render.mjs full [fromSec toSec] [name]   → out/<name|overlay>.mp4 (video only; CONCURRENCY env, default 3)
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const [mode = 'sheet', ...rest] = process.argv.slice(2);
const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(root, 'out'); fs.mkdirSync(out, { recursive: true });
const browserExecutable = process.env.CHROME_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public'), outDir: process.env.BUNDLE_DIR || undefined });
const composition = await selectComposition({ serveUrl, id: 'VSL', browserExecutable });
const FPS = composition.fps;

if (mode === 'stills' || mode === 'sheet') {
  const name = mode === 'sheet' ? rest.shift() : null;
  const secs = rest.map(Number);
  const files = [];
  for (const s of secs) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(s * FPS));
    const file = path.join(out, `${name ?? 'still'}_${String(frame).padStart(5, '0')}.png`);
    await renderStill({ composition, serveUrl, frame, output: file, scale: Number(process.env.SCALE || 0.5), browserExecutable });
    files.push([file, s]); console.log('still', s.toFixed(2), 'frame', frame);
  }
  if (name) {
    const args = ['-v', 'error', '-y'];
    files.forEach(([f]) => args.push('-i', f));
    const lab = files.map(([, s], i) => `[${i}]drawtext=text='${s.toFixed(2)}s':x=10:y=10:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6[l${i}]`);
    const cols = 4, rows = Math.ceil(files.length / cols);
    const pads = [];
    for (let i = files.length; i < rows * cols; i++) pads.push(`color=black:s=${Math.round(1920 * Number(process.env.SCALE || 0.5))}x${Math.round(1080 * Number(process.env.SCALE || 0.5))}:d=1[l${i}]`);
    const all = Array.from({ length: rows * cols }, (_, i) => `[l${i}]`).join('');
    const g = [...lab, ...pads, `${all}xstack=inputs=${rows * cols}:layout=${Array.from({ length: rows * cols }, (_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : '0'}`).join('|')}[o]`].join(';');
    execFileSync('ffmpeg', [...args, '-filter_complex', g, '-map', '[o]', '-frames:v', '1', path.join(out, `${name}.jpg`)]);
    files.forEach(([f]) => fs.unlinkSync(f));
    console.log('sheet', path.join(out, `${name}.jpg`));
  }
} else {
  const [a, b, name = 'overlay'] = rest;
  const frameRange = a !== undefined ? [Math.round(Number(a) * FPS), Math.min(composition.durationInFrames - 1, Math.round(Number(b) * FPS) - 1)] : null;
  const t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: 'h264', crf: 16, muted: true, concurrency: Number(process.env.CONCURRENCY || 3), browserExecutable,
    frameRange, outputLocation: path.join(out, `${name}.mp4`),
    onProgress: ({ progress }) => { const pc = Math.round(progress * 100); if (pc % 10 === 0) process.stdout.write(`\r${pc}%`); } });
  console.log(`\ndone ${name} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
