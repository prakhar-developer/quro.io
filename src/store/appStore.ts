import { create } from 'zustand';
import { fetchSessions } from '../services/api';
import type { PastSession } from '../services/api';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isStreaming?: boolean;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone_number?: string;
  api_key: string;
  is_admin?: boolean;
}

export interface Summary {
  title: string;
  english_summary: string;
  hindi_summary: string;
  mathematical_insights: string[];
  pictorial_concepts: string[];
  crust: string[];
}

export interface WorkspaceDocument {
  filename: string;
  file_size: number;
  summary: Summary;
}

interface AppState {
  sessionId: string | null;
  sessionDbId: string | null;           // DB id of the first DocumentSession (for chat anchoring)
  uploadedFiles: File[];
  pendingFiles: File[];                 // Files queued while auth modal is open
  pendingFile: File | null;             // Single file waiting for auth
  isProcessing: boolean;
  documents: WorkspaceDocument[];
  messages: Message[];
  activeTab: 'summary' | 'synthesis' | 'chat';
  isModalOpen: boolean;
  showApiDocs: boolean;
  showAdminPanel: boolean;
  showSessionHistory: boolean;
  token: string | null;
  user: UserProfile | null;
  guestUploadCount: number;
  pastSessions: PastSession[];
  isLoadingSessions: boolean;

  // Actions
  setSessionId: (id: string) => void;
  setSessionDbId: (id: string | null) => void;
  setUploadedFiles: (files: File[]) => void;
  setPendingFiles: (files: File[]) => void;
  setPendingFile: (file: File | null) => void;
  setIsProcessing: (status: boolean) => void;
  setDocuments: (docs: WorkspaceDocument[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (text: string, isStreaming?: boolean) => void;
  setActiveTab: (tab: 'summary' | 'synthesis' | 'chat') => void;
  setIsModalOpen: (status: boolean) => void;
  setShowApiDocs: (status: boolean) => void;
  setShowAdminPanel: (status: boolean) => void;
  setShowSessionHistory: (status: boolean) => void;
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  incrementGuestUpload: () => void;
  loadPastSessions: () => Promise<void>;
  removeSession: (id: string) => void;
  logout: () => void;
  reset: () => void;
}

function loadStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  sessionId: null,
  sessionDbId: null,
  uploadedFiles: [],
  pendingFiles: [],
  pendingFile: null,
  isProcessing: false,
  documents: [],
  messages: [],
  activeTab: 'summary',
  isModalOpen: false,
  showApiDocs: false,
  showAdminPanel: false,
  showSessionHistory: false,
  token: localStorage.getItem('token'),
  user: loadStoredUser(),
  guestUploadCount: parseInt(localStorage.getItem('guestUploadCount') || '0'),
  pastSessions: [],
  isLoadingSessions: false,

  setSessionId: (id) => set({ sessionId: id }),
  setSessionDbId: (id) => set({ sessionDbId: id }),
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  setPendingFiles: (files) => set({ pendingFiles: files }),
  setPendingFile: (file) => set({ pendingFile: file }),
  setIsProcessing: (status) => set({ isProcessing: status }),
  setDocuments: (docs) => set({ documents: docs }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (text, isStreaming) => set((state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && lastMessage.sender === 'ai') {
      const updatedMessages = [...state.messages];
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMessage,
        text: lastMessage.isStreaming ? lastMessage.text + text : text,
        isStreaming: isStreaming ?? lastMessage.isStreaming,
      };
      return { messages: updatedMessages };
    }
    return state;
  }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsModalOpen: (status) => set({ isModalOpen: status }),
  setShowApiDocs: (status) => set({ showApiDocs: status }),
  setShowAdminPanel: (status) => set({ showAdminPanel: status }),
  setShowSessionHistory: (status) => set({ showSessionHistory: status }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  setUser: (user) => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
    set({ user });
  },
  incrementGuestUpload: () => set((state) => {
    const newCount = state.guestUploadCount + 1;
    localStorage.setItem('guestUploadCount', newCount.toString());
    return { guestUploadCount: newCount };
  }),
  loadPastSessions: async () => {
    const { token } = get();
    if (!token) return;
    set({ isLoadingSessions: true });
    try {
      const data = await fetchSessions();
      set({ pastSessions: data.sessions });
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      set({ isLoadingSessions: false });
    }
  },
  removeSession: (id) =>
    set((state) => ({ pastSessions: state.pastSessions.filter((s) => s.id !== id) })),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      token: null,
      user: null,
      uploadedFiles: [],
      pendingFiles: [],
      pendingFile: null,
      isProcessing: false,
      documents: [],
      messages: [],
      sessionId: null,
      sessionDbId: null,
      activeTab: 'summary',
      pastSessions: [],
      showSessionHistory: false,
    });
  },
  reset: () => set({
    uploadedFiles: [],
    pendingFiles: [],
    pendingFile: null,
    isProcessing: false,
    documents: [],
    messages: [],
    activeTab: 'summary',
    sessionId: null,
    sessionDbId: null,
  }),
}));
