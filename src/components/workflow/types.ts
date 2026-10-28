export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'failed';

export interface WorkflowState {
  // Input Node Data
  topic: string;
  styleId: string;
  bpm: number;
  studioMode: 'duo' | 'solo';
  photo1: string;
  photo2?: string;

  // Lyrics Node Data
  lyricsModel: string;
  lyricsLanguage: string;
  generatedTitle: string;
  generatedLyrics: string;
  lyricsLatency?: number;

  // Music Node Data
  musicModel: string;
  musicTaskId?: string;
  generatedAudioUrl?: string;
  musicLatency?: number;

  // Video Node Data
  videoModel: string;
  videoResolution: string;
  videoRatio?: string;
  videoDuration: number;
  videoPrompt?: string;
  videoTaskId?: string;
  generatedVideoUrl?: string;
  videoLatency?: number;

  // Execution meta
  mock: boolean;
  activeRunningNode?: string | null;
  logs: string[];
}
