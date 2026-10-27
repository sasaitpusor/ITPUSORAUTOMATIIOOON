import React from 'react';
import { AbsoluteFill, Composition, registerRoot } from 'remotion';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import { B, FPS, H, TOTAL_FRAMES, W } from './brand';
import { ChapterPills, Footage, Subtitles, useFonts } from './core/core';
import * as c00 from './chapters/ch00';
import * as c01 from './chapters/ch01';
import * as c02a from './chapters/ch02a';
import * as c02b from './chapters/ch02b';
import * as c03 from './chapters/ch03';
import * as c04 from './chapters/ch04';
import * as c05 from './chapters/ch05';
import * as c05b from './chapters/ch05b';
import * as c06 from './chapters/ch06';
import * as c07 from './chapters/ch07';

const CH = [c00, c01, c02a, c02b, c03, c04, c05, c05b, c06, c07];
const NAVY = CH.flatMap((c) => c.NAVY);
const HIDE = CH.flatMap((c) => c.HIDE_SUBS);

const VSL: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: B.c.navy }}>
      <Footage />
      {CH.map((c, i) => <c.default key={i} />)}
      <ChapterPills />
      <Subtitles navy={NAVY} hide={HIDE} />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => <Composition id="VSL" component={VSL} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />;
registerRoot(Root);
