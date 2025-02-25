export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface WasteItem {
  type: string;
  timestamp: number;
  confidence: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type WasteCategory = 'recyclable' | 'electronic' | 'hazardous' | 'organic' | 'general' | 'unknown';