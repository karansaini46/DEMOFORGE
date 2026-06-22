import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type BrowserTemplate = 'modern-saas' | 'dark-dev' | 'bold-startup';

export interface BrowserFrameProps {
  /** Shown (truncated) in the fake URL bar. */
  url: string;
  /** Outer canvas width — spec: 1280. */
  width: number;
  /** Outer canvas height — spec: 720. */
  height: number;
  /** Selects the gradient + window theme. */
  template: BrowserTemplate;
}

// ---- Per-theme styling ----------------------------------------------------
interface Theme {
  /** 135deg gradient behind the browser window. */
  gradient: string;
  /** Browser window fill. */
  windowBg: string;
  /** URL bar pill fill. */
  urlBarBg: string;
  /** URL text + lock icon color. */
  urlText: string;
}

const THEMES: Record<BrowserTemplate, Theme> = {
  'modern-saas': {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    windowBg: '#ffffff',
    urlBarBg: 'rgba(0,0,0,0.08)',
    urlText: '#666666',
  },
  'dark-dev': {
    gradient: 'linear-gradient(135deg, #0D1117 0%, #1a1a2e 100%)',
    windowBg: '#0D1117',
    urlBarBg: 'rgba(255,255,255,0.08)',
    urlText: '#aaaaaa',
  },
  'bold-startup': {
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #F7C948 100%)',
    windowBg: '#ffffff',
    urlBarBg: 'rgba(0,0,0,0.08)',
    urlText: '#666666',
  },
};

// ---- Geometry (literal spec) ---------------------------------------------
const WIN = { x: 60, y: 43, width: 1160, height: 634, radius: 12 };
const TOPBAR_HEIGHT = 38;
const URLBAR = { width: 420, height: 24, radius: 12 };
const TRAFFIC = [
  { cx: 18, fill: '#FF5F57' },
  { cx: 38, fill: '#FFBD2E' },
  { cx: 58, fill: '#28CA40' },
];
const DOT_R = 6;
const MOUNT_FRAMES = 20;

const truncate = (s: string, max = 40): string =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

// Small SVG padlock, drawn at 12x12, tinted to the theme's url color.
const LockIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <rect x={5} y={11} width={14} height={9} rx={2} fill={color} opacity={0.85} />
    <path
      d="M8 11V8a4 4 0 0 1 8 0v3"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      opacity={0.85}
    />
  </svg>
);

/**
 * A browser-chrome mockup wrapper. Renders a gradient backdrop, a rounded
 * browser window, and a top bar (traffic lights + URL bar). The content area
 * (1160x596 below the top bar) is deliberately left TRANSPARENT — downstream
 * compositing places the screen recording there.
 */
export const BrowserFrame: React.FC<BrowserFrameProps> = ({ url, width, height, template }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = THEMES[template] ?? THEMES['modern-saas'];

  // Mount: slide up from +30px and fade in over the first 20 frames.
  const enter = spring({
    frame,
    fps,
    durationInFrames: MOUNT_FRAMES,
    config: { damping: 200 },
  });
  const translateY = (1 - enter) * 30;
  const opacity = enter;

  return (
    <AbsoluteFill style={{ width, height, background: theme.gradient }}>
      <div
        style={{
          position: 'absolute',
          left: WIN.x,
          top: WIN.y,
          width: WIN.width,
          height: WIN.height,
          borderRadius: WIN.radius,
          background: theme.windowBg,
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          transform: `translateY(${translateY}px)`,
          opacity,
          overflow: 'hidden',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: WIN.width,
            height: TOPBAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Traffic light dots */}
          <svg
            width={WIN.width}
            height={TOPBAR_HEIGHT}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {TRAFFIC.map((d) => (
              <circle key={d.cx} cx={d.cx} cy={TOPBAR_HEIGHT / 2} r={DOT_R} fill={d.fill} />
            ))}
          </svg>

          {/* URL bar — centered in the top bar */}
          <div
            style={{
              position: 'absolute',
              left: (WIN.width - URLBAR.width) / 2,
              top: (TOPBAR_HEIGHT - URLBAR.height) / 2,
              width: URLBAR.width,
              height: URLBAR.height,
              borderRadius: URLBAR.radius,
              background: theme.urlBarBg,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 10px',
              boxSizing: 'border-box',
            }}
          >
            <LockIcon color={theme.urlText} />
            <span
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: 11,
                color: theme.urlText,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {truncate(url)}
            </span>
          </div>
        </div>

        {/*
          Content area: WIN.width x (WIN.height - TOPBAR_HEIGHT) starting at
          y = TOPBAR_HEIGHT. Intentionally rendered as nothing — it stays
          transparent so the screen recording shows through.
        */}
      </div>
    </AbsoluteFill>
  );
};

export default BrowserFrame;
