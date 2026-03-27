import { create } from "zustand";

export type RemoteViewMode = "fill" | "fit";

type Point = { x: number; y: number };

type CallUiState = {
  shareNotice: string | null;
  remoteViewMode: RemoteViewMode;
  remoteZoomScale: number;
  isPinchingRemote: boolean;
  isPanningRemote: boolean;
  remotePanOffset: Point;
  setShareNotice: (notice: string | null) => void;
  clearShareNotice: () => void;
  toggleRemoteViewMode: () => void;
  setRemoteZoomScale: (scale: number) => void;
  setIsPinchingRemote: (isPinching: boolean) => void;
  setIsPanningRemote: (isPanning: boolean) => void;
  setRemotePanOffset: (offset: Point | ((previous: Point) => Point)) => void;
  resetRemoteTransform: () => void;
};

export const useCallUiStore = create<CallUiState>((set) => ({
  shareNotice: null,
  remoteViewMode: "fit",
  remoteZoomScale: 1,
  isPinchingRemote: false,
  isPanningRemote: false,
  remotePanOffset: { x: 0, y: 0 },
  setShareNotice: (notice) => set({ shareNotice: notice }),
  clearShareNotice: () => set({ shareNotice: null }),
  toggleRemoteViewMode: () =>
    set((state) => ({
      remoteViewMode: state.remoteViewMode === "fill" ? "fit" : "fill",
      remoteZoomScale: 1,
      remotePanOffset: { x: 0, y: 0 },
    })),
  setRemoteZoomScale: (scale) => set({ remoteZoomScale: scale }),
  setIsPinchingRemote: (isPinching) => set({ isPinchingRemote: isPinching }),
  setIsPanningRemote: (isPanning) => set({ isPanningRemote: isPanning }),
  setRemotePanOffset: (offset) =>
    set((state) => ({
      remotePanOffset:
        typeof offset === "function" ? offset(state.remotePanOffset) : offset,
    })),
  resetRemoteTransform: () =>
    set({
      remoteZoomScale: 1,
      remotePanOffset: { x: 0, y: 0 },
      isPinchingRemote: false,
      isPanningRemote: false,
    }),
}));
