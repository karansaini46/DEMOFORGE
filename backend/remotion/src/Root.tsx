import React from 'react';
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  getInputProps,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';

import { GeneratedScript } from '../../src/types';

const { fontFamily: SANS } = loadInter('normal', {
  weights: ['500', '600', '700', '800'],
  subsets: ['latin'],
});
const { fontFamily: HAND } = loadCaveat('normal', {
  weights: ['700'],
  subsets: ['latin'],
});

// ---- Palette (soft, premium, blue-on-white) ----
const BG = '#f5f7ff';
const INK = '#1f2540';
const ACCENT = '#5b78ff';
const ACCENT_SOFT = '#aebcff';

const FPS = 30;
const INTRO_SECONDS = 2.5;
const OUTRO_SECONDS = 3;

// Card geometry within the 720x1280 frame.
const CARD = { width: 600, height: 338, x: 60, y: 430, radius: 28 };

export interface ReelProps {
  script: GeneratedScript;
  jobId: string;
  /** Public-relative path (for staticFile) to the normalized screen recording. */
  recordingSrc?: string;
  /** Public-relative path (for staticFile) to the brand logo, if available. */
  logoSrc?: string;
  brandName?: string;
  hook?: string;
  tagline?: string;
  /** Per-section durations in seconds (measured from voiceover). */
  sectionDurations?: number[];
}

const sectionSeconds = (props: ReelProps): number[] => {
  if (props.sectionDurations && props.sectionDurations.length) {
    return props.sectionDurations;
  }
  return (props.script?.sections ?? []).map((s) => s.durationSeconds || 4);
};

// ---------- Animated background ----------
const Blob: React.FC<{
  color: string;
  size: number;
  cx: number;
  cy: number;
  driftX: number;
  driftY: number;
  phase: number;
}> = ({ color, size, cx, cy, driftX, driftY, phase }) => {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame / 90 + phase) * driftX;
  const dy = Math.cos(frame / 110 + phase) * driftY;
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: cx - size / 2 + dx,
        top: cy - size / 2 + dy,
        background: `radial-gradient(circle at center, ${color} 0%, rgba(255,255,255,0) 70%)`,
        filter: 'blur(40px)',
        opacity: 0.7,
      }}
    />
  );
};

const Background: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BG, overflow: 'hidden' }}>
    <Blob color="#c7d2ff" size={620} cx={180} cy={260} driftX={40} driftY={30} phase={0} />
    <Blob color="#dbe3ff" size={720} cx={560} cy={520} driftX={50} driftY={40} phase={2} />
    <Blob color="#d7e0ff" size={560} cx={420} cy={1040} driftX={35} driftY={45} phase={4} />
    <Blob color="#e3e9ff" size={520} cx={120} cy={980} driftX={30} driftY={25} phase={1} />
  </AbsoluteFill>
);

// ---------- Glass card ----------
const GlassCard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const scale = interpolate(enter, [0, 1], [0.92, 1]);
  const sheenX = interpolate(frame % 180, [0, 180], [-CARD.width, CARD.width]);

  return (
    <div
      style={{
        position: 'absolute',
        left: CARD.x,
        top: CARD.y,
        width: CARD.width,
        height: CARD.height,
        borderRadius: CARD.radius,
        transform: `scale(${scale})`,
        opacity: enter,
        background: 'linear-gradient(135deg, #e8edff 0%, #ffffff 55%, #dfe7ff 100%)',
        border: '1px solid rgba(120,150,255,0.45)',
        boxShadow:
          '0 30px 60px rgba(90,120,255,0.25), 0 8px 20px rgba(31,37,64,0.10), inset 0 1px 2px rgba(255,255,255,0.8)',
        overflow: 'hidden',
      }}
    >
      {children}
      {/* moving diagonal sheen */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: sheenX,
          width: 160,
          height: '100%',
          transform: 'skewX(-18deg)',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ---------- Kinetic on-screen headline (word-by-word) ----------
const KineticText: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: CARD.y - 150,
        textAlign: 'center',
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 46,
        lineHeight: 1.15,
        color: INK,
      }}
    >
      {words.map((w, i) => {
        const start = i * 4;
        const o = interpolate(frame, [start, start + 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = interpolate(frame, [start, start + 10], [16, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: 12,
              opacity: o,
              transform: `translateY(${y}px)`,
              color: i === words.length - 1 ? ACCENT : INK,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ---------- Persistent bottom caption ----------
const Caption: React.FC<{ hook: string; tagline: string }> = ({ hook, tagline }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [6, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [6, 24], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: CARD.y + CARD.height + 36,
        textAlign: 'center',
        opacity: o,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: ACCENT }}>
        {hook}
      </div>
      <div
        style={{
          fontFamily: HAND,
          fontWeight: 700,
          fontSize: 64,
          color: ACCENT,
          marginTop: 4,
          lineHeight: 1.1,
        }}
      >
        {tagline}
      </div>
    </div>
  );
};

// ---------- Brand mark (logo or initial) ----------
const BrandMark: React.FC<{ logoSrc?: string; brandName?: string; size: number }> = ({
  logoSrc,
  brandName,
  size,
}) => {
  if (logoSrc) {
    return (
      <Img
        src={logoSrc}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: size * 0.22 }}
      />
    );
  }
  const initial = (brandName?.trim()?.[0] ?? 'D').toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: size * 0.5,
      }}
    >
      {initial}
    </div>
  );
};

// ---------- Intro / Outro reveals (rendered inside the card) ----------
const IntroReveal: React.FC<{ logoSrc?: string; brandName?: string }> = ({
  logoSrc,
  brandName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        transform: `scale(${interpolate(enter, [0, 1], [0.8, 1])})`,
        opacity: enter,
      }}
    >
      <BrandMark logoSrc={logoSrc} brandName={brandName} size={120} />
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: INK }}>
        {brandName || 'Demo'}
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 22, color: ACCENT }}>
        ✦ Let&apos;s take a look
      </div>
    </AbsoluteFill>
  );
};

const OutroReveal: React.FC<{ logoSrc?: string; brandName?: string }> = ({
  logoSrc,
  brandName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 18,
        transform: `scale(${interpolate(enter, [0, 1], [0.8, 1])})`,
        opacity: enter,
      }}
    >
      <BrandMark logoSrc={logoSrc} brandName={brandName} size={130} />
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 38, color: INK }}>
        {brandName || 'Demo'}
      </div>
      <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: 56, color: ACCENT }}>
        try it today!
      </div>
    </AbsoluteFill>
  );
};

// ---------- Main composition ----------
const ExplainerReel: React.FC<ReelProps> = (props) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const introFrames = Math.round(INTRO_SECONDS * fps);
  const outroFrames = Math.round(OUTRO_SECONDS * fps);
  const durations = sectionSeconds(props);
  const middleFrames = Math.max(1, Math.round(durations.reduce((a, b) => a + b, 0) * fps));
  const total = introFrames + middleFrames + outroFrames;

  const hook = props.hook || 'POV: You hire me to create your';
  const tagline = props.tagline || `${props.brandName || 'your SaaS'} explainer video.`;

  // Pre-compute each section's start frame & span for kinetic headlines.
  const sections = props.script?.sections ?? [];
  const sectionWindows: { start: number; span: number; text: string }[] = [];
  {
    let acc = introFrames;
    for (let i = 0; i < durations.length; i++) {
      const span = Math.max(1, Math.round(durations[i] * fps));
      sectionWindows.push({ start: acc, span, text: sections[i]?.onScreenText || '' });
      acc += span;
    }
  }

  const inMiddle = frame >= introFrames && frame < introFrames + middleFrames;

  const recordingUrl = props.recordingSrc ? staticFile(props.recordingSrc) : undefined;
  const logoUrl = props.logoSrc ? staticFile(props.logoSrc) : undefined;

  return (
    <AbsoluteFill>
      <Background />

      <GlassCard>
        {/* Intro reveal inside the card */}
        <Sequence durationInFrames={introFrames}>
          <IntroReveal logoSrc={logoUrl} brandName={props.brandName} />
        </Sequence>

        {/* Embedded screen recording during the middle */}
        {recordingUrl && (
          <Sequence from={introFrames} durationInFrames={middleFrames}>
            <OffthreadVideo
              src={recordingUrl}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Sequence>
        )}
        {!props.recordingSrc && inMiddle && (
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              color: ACCENT,
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 28,
            }}
          >
            [ screen recording ]
          </AbsoluteFill>
        )}

        {/* Outro reveal inside the card */}
        <Sequence from={introFrames + middleFrames} durationInFrames={outroFrames}>
          <OutroReveal logoSrc={logoUrl} brandName={props.brandName} />
        </Sequence>
      </GlassCard>

      {/* Kinetic headline above the card — one Sequence per section */}
      {sectionWindows.map((w, i) =>
        w.text ? (
          <Sequence key={i} from={w.start} durationInFrames={w.span}>
            <KineticText text={w.text} />
          </Sequence>
        ) : null,
      )}

      {/* Persistent caption */}
      <Caption hook={hook} tagline={tagline} />
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  const inputProps = getInputProps() as Partial<ReelProps>;

  const fps = FPS;
  const introFrames = Math.round(INTRO_SECONDS * fps);
  const outroFrames = Math.round(OUTRO_SECONDS * fps);
  const durations =
    inputProps.sectionDurations && inputProps.sectionDurations.length
      ? inputProps.sectionDurations
      : (inputProps.script?.sections ?? []).map((s) => s.durationSeconds || 4);
  const middleFrames = Math.max(1, Math.round(durations.reduce((a, b) => a + b, 0) * fps));
  const durationInFrames = Math.max(1, introFrames + middleFrames + outroFrames);

  const defaultProps: ReelProps = {
    script: inputProps.script ?? { sections: [] },
    jobId: inputProps.jobId ?? 'preview',
    recordingSrc: inputProps.recordingSrc,
    logoSrc: inputProps.logoSrc,
    brandName: inputProps.brandName,
    hook: inputProps.hook,
    tagline: inputProps.tagline,
    sectionDurations: inputProps.sectionDurations,
  };

  return (
    <Composition
      id="explainer-reel"
      component={ExplainerReel}
      durationInFrames={durationInFrames}
      fps={fps}
      width={720}
      height={1280}
      defaultProps={defaultProps}
    />
  );
};
