/**
 * Shared types for the demo-generation pipeline: the LLM-generated script,
 * its sections, and the synthesized audio segments derived from each narration.
 */

export interface ScriptSection {
  narration: string;
  /** Storyboard action — format: 'navigate:<sel>' | 'click:<sel>' | 'scroll:down' | 'wait:<ms>'. */
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

export interface AudioSegment {
  path: string;
  durationMs: number;
}
