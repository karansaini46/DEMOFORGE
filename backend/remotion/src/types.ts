/**
 * Prop/types for the Remotion overlay compositions. Mirrors the backend
 * GeneratedScript shape (kept local so the render bundle is self-contained).
 */

export interface ScriptSection {
  narration: string;
  action: string;
  highlightText: string;
  durationSeconds: number;
}

export interface GeneratedScript {
  appTitle: string;
  tagline: string;
  sections: ScriptSection[];
  outroText: string;
  totalEstimatedSeconds: number;
}

export interface DemoVideoProps {
  script: GeneratedScript;
  /** Screenshots as data URIs (so the browser can load them without file access). */
  screenshots: string[];
}

export interface Theme {
  fontFamily: string;
  background: string;
  /** Accent colour for highlights/callouts. */
  accent: string;
  textColor: string;
  /** Background of the bottom captions bar. */
  captionBg: string;
  captionColor: string;
  highlightTextTransform: 'none' | 'uppercase';
}

export const FPS = 30;
export const INTRO_SECONDS = 5;
export const OUTRO_SECONDS = 5;

/** Total composition length in frames for a given script. */
export function totalDurationInFrames(script: GeneratedScript): number {
  const sectionsSeconds = script.sections.reduce(
    (sum, s) => sum + (s.durationSeconds || 0),
    0,
  );
  return Math.round(
    (INTRO_SECONDS + sectionsSeconds + OUTRO_SECONDS) * FPS,
  );
}
