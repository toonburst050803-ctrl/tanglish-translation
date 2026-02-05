
export enum AppView {
  EDITOR = 'EDITOR',
  LIVE_CHAT = 'LIVE_CHAT',
  VIDEO_GEN = 'VIDEO_GEN'
}

export enum ConversionPreset {
  NEUTRAL = 'neutral',
  CINEMA = 'cinema',
  YOUTUBE = 'youtube',
  FORMAL = 'formal',
  SLANG = 'slang'
}

export interface SubtitleBlock {
  id: number;
  timeRange: string;
  text: string;
  start: number;
  end: number;
}

export interface VideoGenConfig {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
}
