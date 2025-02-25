import { create } from 'zustand';
import { WasteItem, ChatMessage } from '../types';

interface WasteStore {
  detectedItems: WasteItem[];
  chatHistory: ChatMessage[];
  selectedImage: string | null;
  addDetection: (item: WasteItem) => void;
  addChatMessage: (message: ChatMessage) => void;
  setSelectedImage: (image: string | null) => void;
  clearDetections: () => void;
}

export const useWasteStore = create<WasteStore>((set) => ({
  detectedItems: [],
  chatHistory: [],
  selectedImage: null,
  addDetection: (item) =>
    set((state) => ({
      detectedItems: [...state.detectedItems, item],
    })),
  addChatMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    })),
  setSelectedImage: (image) =>
    set(() => ({
      selectedImage: image,
    })),
  clearDetections: () => set({ detectedItems: [] }),
}));