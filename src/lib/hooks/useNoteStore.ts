"use client";

import { create } from "zustand";
import type { NoteId, FolderId } from "@/lib/evolu";

interface NoteStore {
  selectedNoteId: NoteId | null;
  selectedFolderId: FolderId | null;
  setSelectedNoteId: (id: NoteId | null) => void;
  setSelectedFolderId: (id: FolderId | null) => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  selectedNoteId: null,
  selectedFolderId: null,
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
}));
