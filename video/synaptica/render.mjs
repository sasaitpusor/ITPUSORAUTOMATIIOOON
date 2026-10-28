import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [mode = 'stills', ...rest] = process.argv.slice(2);
const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(root, 'out');
fs.mkdirSync(out, {recursive: true});
const browserExecutable = process.env.CHROME_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public')});
const composition = await selectComposition({serveUrl, id: 'Synaptica', browserExecutable});

if (mode === 'stills') {
  const frames = rest.length ? rest.map(Number) : [15, 60, 105, 160, 205, 270, 430, 500, 600, 720, 800, 880];
  for (const frame of frames) {
    await renderStill({composition, serveUrl, frame, output: path.join(out, `still_${String(frame).padStart(3, '0')}.png`), scale: Number(process.env.SCALE || 0.4), browserExecutable});
    console.log('still', frame);
  }
} else {
  const t0 = Date.now();
  await renderMedia({
    composition, serveUrl, codec: 'h264', crf: 17, muted: true, concurrency: 4, browserExecutable,
    outputLocation: path.join(out, 'overlay.mp4'),
    onProgress: ({progress}) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r${Math.round(progress * 100)}%`); },
  });
  console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
