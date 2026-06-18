import React from 'react';

import { DemoVideo } from '../DemoVideo';
import { DemoVideoProps, Theme } from '../types';

// Dark, terminal-inspired developer aesthetic with a mono font and green accent.
const THEME: Theme = {
  fontFamily:
    "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Consolas, monospace",
  background: 'linear-gradient(135deg, #0b1120 0%, #111827 100%)',
  accent: '#22d3ee',
  textColor: '#e5e7eb',
  captionBg: 'rgba(2, 6, 23, 0.9)',
  captionColor: '#a7f3d0',
  highlightTextTransform: 'none',
};

export const DarkDev: React.FC<DemoVideoProps> = (props) => (
  <DemoVideo {...props} theme={THEME} />
);
