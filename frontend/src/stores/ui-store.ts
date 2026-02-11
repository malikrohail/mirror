import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  activeTab: string;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  activeTab: 'overview',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
