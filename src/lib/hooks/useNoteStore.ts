"use client";

import { create } from "zustand";
import type { NoteId, FolderId } from "@/lib/evolu";

interface NoteStore {
  selectedNoteId: NoteId | null;
  selectedFolderId: FolderId | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  tagFilter: string[]; // Tags to filter by
  setSelectedNoteId: (id: NoteId | null) => void;
  setSelectedFolderId: (id: FolderId | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setTagFilter: (tags: string[]) => void;
  addTagToFilter: (tag: string) => void;
  removeTagFromFilter: (tag: string) => void;
  clearTagFilter: () => void;
}

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 256;

export const useNoteStore = create<NoteStore>((set) => ({
  selectedNoteId: null,
  selectedFolderId: null,
  sidebarOpen: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  sidebarCollapsed: false,
  tagFilter: [],
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarWidth: (width) =>
    set({ sidebarWidth: Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width)) }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTagFilter: (tags) => set({ tagFilter: tags }),
  addTagToFilter: (tag) => set((state) => ({
    tagFilter: state.tagFilter.includes(tag) ? state.tagFilter : [...state.tagFilter, tag]
  })),
  removeTagFromFilter: (tag) => set((state) => ({
    tagFilter: state.tagFilter.filter((t) => t !== tag)
  })),
  clearTagFilter: () => set({ tagFilter: [] }),
}));
