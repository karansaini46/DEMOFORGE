import React from 'react';
import { AbsoluteFill, Composition, getInputProps, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { GeneratedScript } from '../../src/types';

export interface OverlayProps {
  script: GeneratedScript;
  jobId: string;
}

const BaseTemplate: React.FC<OverlayProps & {
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}> = ({ script, bgColor, textColor, accentColor, fontFamily }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!script || !script.sections) return null;

  const introFrames = 5 * fps;
  const outroFrames = 5 * fps;

  let currentNarration = '';
  
  if (frame < introFrames) {
    currentNarration = 'Welcome to the Demo!';
  } else if (frame > durationInFrames - outroFrames) {
    currentNarration = 'Thanks for watching!';
  } else {
    let accumulatedFrames = introFrames;
    for (const section of script.sections) {
      const sectionFrames = section.durationSeconds * fps;
      if (frame >= accumulatedFrames && frame < accumulatedFrames + sectionFrames) {
        currentNarration = section.narration;
        break;
      }
      accumulatedFrames += sectionFrames;
    }
  }

  // Fade in/out animation for the text box based on its presence
  const opacity = interpolate(
    frame % (2 * fps), // pulse
    [0, fps, 2 * fps],
    [0.85, 1, 0.85]
  );

  return (
    <AbsoluteFill style={{ fontFamily }}>
      {/* Intro Overlay */}
      {frame < introFrames && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: bgColor, color: textColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px',
          fontWeight: 'bold', zIndex: 10
        }}>
          Automated Demo
        </div>
      )}

      {/* Outro Overlay */}
      {frame > durationInFrames - outroFrames && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: bgColor, color: textColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px',
          fontWeight: 'bold', zIndex: 10
        }}>
          Try it today!
        </div>
      )}

      {/* Captions Bar */}
      {frame >= introFrames && frame <= durationInFrames - outroFrames && currentNarration && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: bgColor,
          color: textColor,
          padding: '24px 48px',
          borderRadius: '16px',
          fontSize: '36px',
          fontWeight: '600',
          textAlign: 'center',
          maxWidth: '85%',
          boxShadow: `0 10px 30px ${accentColor}60`,
          border: `2px solid ${accentColor}`,
          opacity,
          zIndex: 5
        }}>
          {currentNarration}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const ModernSaaS: React.FC<OverlayProps> = (props) => (
  <BaseTemplate {...props} bgColor="#ffffff" textColor="#1f2937" accentColor="#3b82f6" fontFamily="system-ui, sans-serif" />
);

export const DarkDev: React.FC<OverlayProps> = (props) => (
  <BaseTemplate {...props} bgColor="#111827" textColor="#10b981" accentColor="#059669" fontFamily="monospace" />
);

export const BoldStartup: React.FC<OverlayProps> = (props) => (
  <BaseTemplate {...props} bgColor="#ec4899" textColor="#ffffff" accentColor="#fbcfe8" fontFamily="sans-serif" />
);

export const RemotionRoot: React.FC = () => {
  const inputProps = getInputProps() as OverlayProps;
  
  // Base duration is sum of sections duration + 10 seconds for intro/outro
  let durationInSeconds = 10;
  if (inputProps.script?.sections) {
    durationInSeconds += inputProps.script.sections.reduce((acc, sec) => acc + sec.durationSeconds, 0);
  } else {
    // Default fallback
    durationInSeconds = 10;
  }
  
  const fps = 30;
  const durationInFrames = Math.max(1, Math.round(durationInSeconds * fps));

  return (
    <>
      <Composition
        id="modern-saas"
        component={ModernSaaS}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1280}
        height={720}
        defaultProps={inputProps}
      />
      <Composition
        id="dark-dev"
        component={DarkDev}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1280}
        height={720}
        defaultProps={inputProps}
      />
      <Composition
        id="bold-startup"
        component={BoldStartup}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1280}
        height={720}
        defaultProps={inputProps}
      />
    </>
  );
};
