import React from 'react';

import { DemoVideo } from '../DemoVideo';
import { DemoVideoProps, Theme } from '../types';

// Clean, light, product-marketing look with a blue accent.
const THEME: Theme = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
  accent: '#2563eb',
  textColor: '#0f172a',
  captionBg: 'rgba(15, 23, 42, 0.85)',
  captionColor: '#ffffff',
  highlightTextTransform: 'none',
};

export const ModernSaaS: React.FC<DemoVideoProps> = (props) => (
  <DemoVideo {...props} theme={THEME} />
);
