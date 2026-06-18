import React from 'react';

import { DemoVideo } from '../DemoVideo';
import { DemoVideoProps, Theme } from '../types';

// High-energy startup look: vibrant gradient, big bold type, uppercase callouts.
const THEME: Theme = {
  fontFamily:
    "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)',
  accent: '#facc15',
  textColor: '#ffffff',
  captionBg: 'rgba(24, 0, 36, 0.78)',
  captionColor: '#ffffff',
  highlightTextTransform: 'uppercase',
};

export const BoldStartup: React.FC<DemoVideoProps> = (props) => (
  <DemoVideo {...props} theme={THEME} />
);
