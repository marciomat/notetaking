"use client";

import { create } from "zustand";
import type { NoteId, FolderId } from "@/lib/evolu";

interface NoteStore {
  selectedNoteId: NoteId | null;
  selectedFolderId: FolderId | null;
  sidebarOpen: boolean;
  setSelectedNoteId: (id: NoteId | null) => void;
  setSelectedFolderId: (id: FolderId | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  selectedNoteId: null,
  selectedFolderId: null,
  sidebarOpen: false,
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
