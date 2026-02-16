import { create } from 'zustand';

// ── Navigation loading state ─────────────────────────────

interface NavLoadingStore {
  isNavigating: boolean;
  _timeout: ReturnType<typeof setTimeout> | null;
  startNavigation: () => void;
  endNavigation: () => void;
}

export const useNavLoadingStore = create<NavLoadingStore>((set, get) => ({
  isNavigating: false,
  _timeout: null,
  startNavigation: () => {
    const prev = get()._timeout;
    if (prev) clearTimeout(prev);
    // Safety: auto-clear after 5s in case navigation event is missed
    const timeout = setTimeout(() => set({ isNavigating: false, _timeout: null }), 5000);
    set({ isNavigating: true, _timeout: timeout });
  },
  endNavigation: () => {
    const prev = get()._timeout;
    if (prev) clearTimeout(prev);
    set({ isNavigating: false, _timeout: null });
  },
}));
