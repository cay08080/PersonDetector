export enum DetectionStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  PERSON_DETECTED = 'PERSON_DETECTED',
  NO_PERSON = 'NO_PERSON',
  STATIC_SCENE = 'STATIC_SCENE',
  ERROR = 'ERROR',
  COOLDOWN = 'COOLDOWN'
}

export interface AnalysisResult {
  status: DetectionStatus;
  message: string;
  timestamp: number;
  description?: string;
  confidence?: number; // 0 to 100
}

export interface WebcamRef {
  getScreenshot: () => string | null;
}