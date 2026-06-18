import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import {
  DemoVideoProps,
  FPS,
  INTRO_SECONDS,
  OUTRO_SECONDS,
  ScriptSection,
  Theme,
} from './types';

/** Captions bar pinned to the bottom, shown across section + outro narration. */
const CaptionBar: React.FC<{ text: string; theme: Theme }> = ({
  text,
  theme,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '28px 64px',
        background: theme.captionBg,
        color: theme.captionColor,
        fontSize: 30,
        lineHeight: 1.35,
        fontFamily: theme.fontFamily,
        textAlign: 'center',
        opacity,
      }}
    >
      {text}
    </div>
  );
};

const Intro: React.FC<{ title: string; tagline: string; theme: Theme }> = ({
  title,
  tagline,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 14 } });
  const taglineOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: theme.fontFamily,
        textAlign: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          color: theme.textColor,
          fontSize: 84,
          fontWeight: 800,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 24,
          color: theme.accent,
          fontSize: 38,
          opacity: taglineOpacity,
        }}
      >
        {tagline}
      </div>
    </AbsoluteFill>
  );
};

const SectionCallout: React.FC<{
  section: ScriptSection;
  screenshot?: string;
  theme: Theme;
}> = ({ section, screenshot, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const slide = interpolate(enter, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      {screenshot ? (
        <Img
          src={screenshot}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
          }}
        />
      ) : null}

      {/* Highlight callout (top-left). */}
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 64,
          transform: `translateX(${slide}px)`,
          opacity: enter,
          background: theme.accent,
          color: theme.background,
          padding: '16px 28px',
          borderRadius: 12,
          fontFamily: theme.fontFamily,
          fontSize: 40,
          fontWeight: 700,
          textTransform: theme.highlightTextTransform,
          maxWidth: '70%',
        }}
      >
        {section.highlightText}
      </div>

      <CaptionBar text={section.narration} theme={theme} />
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ text: string; theme: Theme }> = ({ text, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: theme.fontFamily,
        textAlign: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          color: theme.textColor,
          fontSize: 56,
          fontWeight: 800,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Shared demo-video structure used by all three templates:
 * Intro (5s) → one callout Sequence per section (timed to durationSeconds) → Outro (5s).
 * The visual identity comes entirely from the `theme` prop.
 */
export const DemoVideo: React.FC<DemoVideoProps & { theme: Theme }> = ({
  script,
  screenshots,
  theme,
}) => {
  const introFrames = INTRO_SECONDS * FPS;
  const outroFrames = OUTRO_SECONDS * FPS;

  let cursor = introFrames;

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <Sequence from={0} durationInFrames={introFrames}>
        <Intro title={script.appTitle} tagline={script.tagline} theme={theme} />
      </Sequence>

      {script.sections.map((section, i) => {
        const durationInFrames = Math.max(
          1,
          Math.round((section.durationSeconds || 0) * FPS),
        );
        const from = cursor;
        cursor += durationInFrames;
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={durationInFrames}
          >
            <SectionCallout
              section={section}
              screenshot={screenshots[i % Math.max(1, screenshots.length)]}
              theme={theme}
            />
          </Sequence>
        );
      })}

      <Sequence from={cursor} durationInFrames={outroFrames}>
        <Outro text={script.outroText} theme={theme} />
      </Sequence>
    </AbsoluteFill>
  );
};
