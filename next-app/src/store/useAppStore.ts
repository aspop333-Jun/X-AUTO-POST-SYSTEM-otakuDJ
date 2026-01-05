import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface EventInfo {
    eventEn: string;
    eventJp: string;
    date: string;
    venue: string;
    category: string;
    hashtags: string;
}

export interface ImageSettings {
    filters: {
        brightness: number;
        contrast: number;
        saturation: number;
        blur: number;
        sharpen: number;
    };
    crop?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    rotation: number;
    flipH: boolean;
    flipV: boolean;
}

export interface PostItem {
    id: string;
    imageFile: string | null; // Base64 or URL (legacy)
    images?: string[]; // Array of base64 strings (max 4) - optional for backwards compat
    imageBase64: string | null; // Legacy: First image for backwards compatibility
    boothName: string;
    boothAccount: string;
    personRole: string;
    personName: string;
    personAccount: string;
    aiComment: string;
    analysisResult?: any; // Kotaroスコアリング結果を保持
    status: 'draft' | 'ready' | 'sending' | 'sent' | 'failed';
    eventInfo: EventInfo;
    imageSettings?: ImageSettings;
    createdAt: number;
    updatedAt: number;
}

export interface AppSettings {
    defaultEventInfo: EventInfo;
    makeWebhookUrl: string;
}

interface AppState {
    currentStep: number;
    settings: AppSettings;
    eventInfo: EventInfo;
    postQueue: PostItem[];
    currentEditIndex: number | null;

    // Event-first workflow
    isEventInfoSet: boolean;
    currentEventInfo: EventInfo;

    // Actions
    setStep: (step: number) => void;
    setEventInfo: (info: Partial<EventInfo>) => void;
    addToQueue: (post: Omit<PostItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateQueueItem: (index: number, updates: Partial<PostItem>) => void;
    removeFromQueue: (index: number) => void;
    setCurrentEditIndex: (index: number | null) => void;
    clearQueue: () => void;
    setSettings: (settings: Partial<AppSettings>) => void;

    // Event-first workflow actions
    setCurrentEventInfo: (info: EventInfo) => void;
    clearCurrentEventInfo: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            currentStep: 1,
            settings: {
                defaultEventInfo: {
                    eventEn: '',
                    eventJp: '',
                    date: '',
                    venue: '',
                    category: 'ブース',
                    hashtags: ''
                },
                makeWebhookUrl: ''
            },
            eventInfo: {
                eventEn: '',
                eventJp: '',
                date: '',
                venue: '',
                category: 'ブース',
                hashtags: ''
            },
            postQueue: [],
            currentEditIndex: null,

            // Event-first workflow state
            isEventInfoSet: false,
            currentEventInfo: {
                eventEn: '',
                eventJp: '',
                date: '',
                venue: '',
                category: 'ブース',
                hashtags: ''
            },

            setStep: (step) => set({ currentStep: step }),
            setEventInfo: (info) => set((state) => ({
                eventInfo: { ...state.eventInfo, ...info }
            })),
            addToQueue: (postData) => set((state) => {
                const newPost: PostItem = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    ...postData,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                return { postQueue: [...state.postQueue, newPost] };
            }),
            updateQueueItem: (index, updates) => set((state) => {
                const newQueue = [...state.postQueue];
                if (newQueue[index]) {
                    newQueue[index] = { ...newQueue[index], ...updates, updatedAt: Date.now() };
                }
                return { postQueue: newQueue };
            }),
            removeFromQueue: (index) => set((state) => {
                const newQueue = [...state.postQueue];
                newQueue.splice(index, 1);
                return { postQueue: newQueue };
            }),
            setCurrentEditIndex: (index) => set({ currentEditIndex: index }),
            clearQueue: () => set({ postQueue: [], currentEditIndex: null }),
            setSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings }
            })),

            // Event-first workflow actions
            setCurrentEventInfo: (info) => set({
                currentEventInfo: info,
                isEventInfoSet: true,
                eventInfo: info // Also update the legacy eventInfo for compatibility
            }),
            clearCurrentEventInfo: () => set({
                isEventInfoSet: false,
                currentEventInfo: {
                    eventEn: '',
                    eventJp: '',
                    date: '',
                    venue: '',
                    category: 'ブース',
                    hashtags: ''
                }
            }),
        }),
        {
            name: 'x-auto-post-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                settings: state.settings,
                eventInfo: state.eventInfo,
                // Note: postQueue is intentionally NOT persisted to avoid large localStorage usage
            }),
        }
    )
);
