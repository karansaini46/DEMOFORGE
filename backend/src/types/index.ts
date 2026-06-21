export interface GeneratedScript {
  sections: ScriptSection[];
  /** Brand/product name shown in the intro & outro reveal. */
  brandName?: string;
  /** First caption line (clean sans), e.g. "POV: You hire me to create your". */
  hook?: string;
  /** Second caption line (handwritten), e.g. "<brand> explainer video.". */
  tagline?: string;
}

export interface ScriptSection {
  action: string;
  durationSeconds: number;
  narration: string;
  /** Short punchy phrase (<= 6 words) shown as kinetic text above the card. */
  onScreenText?: string;
}
