import React from 'react';
import { Composition } from 'remotion';

import { BoldStartup } from './templates/BoldStartup';
import { DarkDev } from './templates/DarkDev';
import { ModernSaaS } from './templates/ModernSaaS';
import {
  DemoVideoProps,
  FPS,
  GeneratedScript,
  totalDurationInFrames,
} from './types';

const WIDTH = 1280;
const HEIGHT = 720;

// Placeholder used only for the Studio preview / default render metadata.
const DEFAULT_SCRIPT: GeneratedScript = {
  appTitle: 'DemoForge',
  tagline: 'Turn any web app into a demo video',
  sections: [
    {
      narration: 'This is a preview section narration.',
      action: 'wait:5',
      highlightText: 'Preview Section',
      durationSeconds: 10,
    },
  ],
  outroText: 'Ready to ship faster.',
  totalEstimatedSeconds: 20,
};

const DEFAULT_PROPS: DemoVideoProps = {
  script: DEFAULT_SCRIPT,
  screenshots: [],
};

// Compute the total frame count from the actual script passed at render time.
const calculateMetadata = ({ props }: { props: DemoVideoProps }) => ({
  durationInFrames: totalDurationInFrames(props.script),
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="modern-saas"
      component={ModernSaaS}
      durationInFrames={totalDurationInFrames(DEFAULT_SCRIPT)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="dark-dev"
      component={DarkDev}
      durationInFrames={totalDurationInFrames(DEFAULT_SCRIPT)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="bold-startup"
      component={BoldStartup}
      durationInFrames={totalDurationInFrames(DEFAULT_SCRIPT)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
  </>
);
