export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'failed';

export interface WorkflowState {
  // Input Node Data
  topic: string;
  styleId: string;
  bpm: number;
  studioMode: 'duo' | 'solo';
  photo1: string;
  photo2?: string;
  photo1Gender?: 'male' | 'female';
  photo2Gender?: 'male' | 'female';
  rawPhoto1?: string;
  rawPhoto2?: string;

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
  vocalGender?: 'auto' | 'male' | 'female' | 'duet';

  // Video Node Data
  videoModel: string;
  videoResolution: string;
  videoRatio?: string;
  videoDuration: number;
  videoPrompt?: string;
  videoTaskId?: string;
  generatedVideoUrl?: string;
  videoLatency?: number;
  referenceVideoUrl?: string;
  motionSyncEnabled?: boolean;
  lipSyncEnabled?: boolean;

  // Execution meta
  mock: boolean;
  activeRunningNode?: string | null;
  logs: string[];

  // Image Prep & Guardrail Bypass Node Data
  processedPhoto1?: string;
  processedPhoto2?: string;
  sunglassesStyle?: string;
  sunglassesScale?: number;
  sunglassesOffsetY?: number;
  sunglassesOffsetX?: number;
  sunglassesRotate?: number;
  filterMode?: 'none' | 'hiphop-grain' | 'cg-smooth' | 'cg-unreal' | 'comic-pop' | string;
  prepLatency?: number;
}
