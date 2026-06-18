export interface GeneratedScript {
  sections: ScriptSection[];
}

export interface ScriptSection {
  action: string;
  durationSeconds: number;
  narration: string;
}
