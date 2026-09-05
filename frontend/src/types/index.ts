export interface HandLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandDetection {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface Prediction {
  label: string;
  confidence: number;
}

export interface ASLClass {
  label: string;
  index: number;
}

export interface InterpreterState {
  isRunning: boolean;
  predictions: Prediction[];
  currentText: string;
  confidence: number;
  error: string | null;
}

export type ModelStatus = 'loading' | 'ready' | 'error' | 'idle';