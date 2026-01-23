"use client";

/**
 * Jazz Data Bridge
 * 
 * This module provides an adapter layer that exposes Jazz data in a format
 * compatible with the existing Evolu-based components. The goal is to minimize
 * changes to the UI components while switching the backend.
 */

import { createContext, useContext, useMemo, useCallback } from "react";
import { useCurrentWorkspace } from "@/components/app/JazzTabContent";

// Type aliases to match Evolu's branded ID types
export type FolderId = string;
export type NoteId = string;
export type SettingsId = string;

// Types that match Evolu's query result format
export interface EvoluNote {
  id: NoteId;
  title: string;
  content: string | null;
  noteType: string;
  isPinned: boolean;
  folderId: FolderId | null;
  tags: string | null;
  calculatorState: string | null;
  viewMode: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvoluFolder {
  id: FolderId;
  name: string;
  parentId: FolderId | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvoluSettings {
  id: SettingsId;
  lastSeenNoteId: NoteId | null;
}

// Adapter context type
interface DataBridgeContextType {
  // Data
  notes: EvoluNote[];
  folders: EvoluFolder[];
  settings: EvoluSettings[];
  
  // CRUD Operations (matching Evolu's insert/update pattern)
  insert: <T extends "notes" | "folders" | "settings">(
    table: T,
    data: T extends "notes" ? Omit<EvoluNote, "id" | "createdAt" | "updatedAt">
        : T extends "folders" ? Omit<EvoluFolder, "id" | "createdAt" | "updatedAt">
        : Partial<EvoluSettings>
  ) => void;
  
  update: <T extends "notes" | "folders" | "settings">(
    table: T,
    data: { id: string } & Partial<
      T extends "notes" ? EvoluNote
      : T extends "folders" ? EvoluFolder
      : EvoluSettings
    >
  ) => void;
  
  // isLoaded flag
  isLoaded: boolean;
}

const DataBridgeContext = createContext<DataBridgeContextType | null>(null);

// Hook to access the bridge
export function useDataBridge(): DataBridgeContextType {
  const context = useContext(DataBridgeContext);
  if (!context) {
    throw new Error("useDataBridge must be used within a DataBridgeProvider");
  }
  return context;
}

// Hook that mimics useQuery for notes
export function useNotesQuery(): EvoluNote[] {
  const { notes } = useDataBridge();
  return notes;
}

// Hook that mimics useQuery for folders
export function useFoldersQuery(): EvoluFolder[] {
  const { folders } = useDataBridge();
  return folders;
}

// Hook that mimics useQuery for settings
export function useSettingsQuery(): EvoluSettings[] {
  const { settings } = useDataBridge();
  return settings;
}

// Hook that provides insert/update mutations
export function useMutations() {
  const { insert, update } = useDataBridge();
  return { insert, update };
}

interface DataBridgeProviderProps {
  children: React.ReactNode;
}

export function DataBridgeProvider({ children }: DataBridgeProviderProps) {
  const workspace = useCurrentWorkspace();
  
  // The notes are already in the correct format from useWorkspaceNotes
  const notes: EvoluNote[] = useMemo(() => {
    if (!workspace.isLoaded) return [];
    return workspace.notes as EvoluNote[];
  }, [workspace.isLoaded, workspace.notes]);
  
  // The folders are already in the correct format from useWorkspaceNotes  
  const folders: EvoluFolder[] = useMemo(() => {
    if (!workspace.isLoaded) return [];
    return workspace.folders as EvoluFolder[];
  }, [workspace.isLoaded, workspace.folders]);
  
  // Settings (derived from workspace.lastSeenNoteId)
  const settings: EvoluSettings[] = useMemo(() => {
    if (!workspace.isLoaded) return [];
    
    return [{
      id: "settings",
      lastSeenNoteId: workspace.lastSeenNoteId ?? null,
    }];
  }, [workspace.isLoaded, workspace.lastSeenNoteId]);
  
  // Insert operation - delegates to workspace methods
  const insert = useCallback(<T extends "notes" | "folders" | "settings">(
    table: T,
    data: unknown
  ) => {
    if (table === "notes") {
      const noteData = data as Omit<EvoluNote, "id" | "createdAt" | "updatedAt">;
      // Create the note with basic info, then update with additional fields
      const noteType = noteData.noteType === "calculator" ? "calculator" : "text";
      const noteId = workspace.createNote(noteData.title, noteType as "text" | "calculator");
      
      // If we got an ID back, update with additional data
      if (noteId) {
        const updates: Record<string, unknown> = {};
        if (noteData.content) updates.content = noteData.content;
        if (noteData.folderId) updates.folderId = noteData.folderId;
        if (noteData.tags) updates.tags = noteData.tags;
        if (noteData.calculatorState) updates.calculatorState = noteData.calculatorState;
        if (noteData.sortOrder) updates.sortOrder = noteData.sortOrder;
        
        if (Object.keys(updates).length > 0) {
          workspace.updateNote(noteId, updates as Parameters<typeof workspace.updateNote>[1]);
        }
      }
    } else if (table === "folders") {
      const folderData = data as Omit<EvoluFolder, "id" | "createdAt" | "updatedAt">;
      workspace.createFolder(folderData.name);
    } else if (table === "settings") {
      const settingsData = data as Partial<EvoluSettings>;
      if (settingsData.lastSeenNoteId) {
        workspace.setLastSeenNote(settingsData.lastSeenNoteId);
      }
    }
  }, [workspace]);
  
  // Update operation - delegates to workspace methods
  const update = useCallback(<T extends "notes" | "folders" | "settings">(
    table: T,
    data: { id: string } & Record<string, unknown>
  ) => {
    if (table === "notes") {
      const { id, ...updates } = data;
      workspace.updateNote(id, updates as {
        title?: string;
        content?: string;
        isPinned?: boolean;
        viewMode?: string;
        tags?: string | null;
        calculatorState?: string | null;
        folderId?: string | null;
        sortOrder?: number;
      });
    } else if (table === "folders") {
      const { id, ...updates } = data;
      workspace.updateFolder(id, updates as { name?: string; sortOrder?: number });
    } else if (table === "settings") {
      const settingsData = data as Partial<EvoluSettings>;
      if (settingsData.lastSeenNoteId !== undefined) {
        workspace.setLastSeenNote(settingsData.lastSeenNoteId);
      }
    }
  }, [workspace]);
  
  const value: DataBridgeContextType = useMemo(() => ({
    notes,
    folders,
    settings,
    insert,
    update,
    isLoaded: workspace.isLoaded,
  }), [notes, folders, settings, insert, update, workspace.isLoaded]);
  
  return (
    <DataBridgeContext.Provider value={value}>
      {children}
    </DataBridgeContext.Provider>
  );
}
