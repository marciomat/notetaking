"use client";

import { useCallback, useMemo } from "react";
import { useAccount } from "jazz-tools/react";
import { Group } from "jazz-tools";
import {
  NumpadAccount,
  Workspace,
  Note,
  Folder,
  NoteList,
  FolderList,
} from "@/lib/jazz/schema";

// ============================================================================
// Type helpers - Jazz types can be complex, so we use these helpers
// ============================================================================

// Type for loaded account with root
type LoadedAccountWithRoot = {
  $isLoaded: true;
  $jazz: { id: string };
  root: LoadedRoot;
};

// Type for loaded root with workspaces  
type LoadedRoot = {
  $isLoaded: true;
  $jazz: { set: (key: string, value: unknown) => void };
  workspaces: LoadedWorkspaceList;
  activeWorkspaceIndex?: number;
};

// Type for loaded workspace list
type LoadedWorkspaceList = {
  $isLoaded: true;
  $jazz: {
    push: (item: unknown) => void;
    remove: (index: number) => void;
    splice: (start: number, deleteCount: number, ...items: unknown[]) => unknown[];
  };
  length: number;
  map: <T>(fn: (ws: LoadedWorkspace, index: number) => T) => T[];
  [index: number]: LoadedWorkspace | undefined;
};

// Type for loaded workspace
type LoadedWorkspace = {
  $isLoaded: true;
  $jazz: { id: string; set: (key: string, value: unknown) => void; delete: (key: string) => void };
  name: string;
  createdAt: Date;
  notes?: LoadedNoteList;
  folders?: LoadedFolderList;
  lastSeenNote?: LoadedNote;
};

// Type for loaded note list
type LoadedNoteList = {
  $isLoaded: true;
  $jazz: { push: (item: unknown) => void };
  filter: (fn: (note: LoadedNote) => boolean) => LoadedNote[];
  find: (fn: (note: LoadedNote) => boolean) => LoadedNote | undefined;
  findIndex: (fn: (note: LoadedNote) => boolean) => number;
};

// Type for loaded note
type LoadedNote = {
  $isLoaded: true;
  $jazz: { id: string; set: (key: string, value: unknown) => void };
  title: string;
  content?: string;
  isPinned: boolean;
  noteType: "text" | "calculator";
  viewMode?: "edit" | "preview";
  tags?: string;
  calculatorState?: string;
  folder?: { $jazz?: { id: string } };
  sortOrder: number;
  deleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Type for loaded folder list
type LoadedFolderList = {
  $isLoaded: true;
  $jazz: { push: (item: unknown) => void; remove: (index: number) => void };
  filter: (fn: (folder: LoadedFolder) => boolean) => LoadedFolder[];
  find: (fn: (folder: LoadedFolder) => boolean) => LoadedFolder | undefined;
  findIndex: (fn: (folder: LoadedFolder) => boolean) => number;
};

// Type for loaded folder
type LoadedFolder = {
  $isLoaded: true;
  $jazz: { id: string; set: (key: string, value: unknown) => void };
  name: string;
  parentFolder?: { $jazz?: { id: string } };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Workspace Hook - manages workspaces (tabs) using Jazz CoValues
// ============================================================================

export interface WorkspaceTab {
  /** Unique ID from Jazz CoValue */
  id: string;
  /** Display name */
  name: string;
  /** Index in the workspaces list */
  index: number;
  /** Creation timestamp */
  createdAt: Date;
}

export interface UseWorkspacesResult {
  /** All workspaces as tab-like objects */
  tabs: WorkspaceTab[];
  /** Currently active workspace index */
  activeIndex: number;
  /** Currently active workspace ID */
  activeWorkspaceId: string | null;
  /** Whether data is loaded */
  isLoaded: boolean;
  
  // Actions
  /** Add a new workspace, returns its index */
  addWorkspace: () => number;
  /** Remove a workspace by index */
  removeWorkspace: (index: number) => void;
  /** Set the active workspace by index */
  setActiveWorkspace: (index: number) => void;
  /** Rename a workspace */
  renameWorkspace: (index: number, name: string) => void;
  /** Reorder workspaces */
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;
}

export function useWorkspaces(): UseWorkspacesResult {
  // Load account
  const meRaw = useAccount();
  
  // Cast to our expected type for easier access
  const me = meRaw as unknown as LoadedAccountWithRoot | { $isLoaded: false };

  const isLoaded = me?.$isLoaded === true && me?.root?.$isLoaded === true;
  const workspaces = isLoaded ? me.root.workspaces : undefined;
  const activeIndex = isLoaded ? (me.root.activeWorkspaceIndex ?? 0) : 0;

  // Convert workspaces CoList to tab-like objects
  const tabs = useMemo<WorkspaceTab[]>(() => {
    if (!workspaces?.$isLoaded) return [];
    
    return workspaces.map((ws: LoadedWorkspace, index: number) => ({
      id: ws.$jazz.id,
      name: ws.name,
      index,
      createdAt: ws.createdAt,
    }));
  }, [workspaces]);

  // Get the active workspace ID
  const activeWorkspaceId = useMemo(() => {
    if (!workspaces?.$isLoaded) return null;
    const ws = workspaces[activeIndex] ?? workspaces[0];
    return ws?.$jazz.id ?? null;
  }, [workspaces, activeIndex]);

  // Add a new workspace
  const addWorkspace = useCallback(() => {
    if (!isLoaded || !workspaces?.$isLoaded) return -1;

    const newIndex = workspaces.length;
    const group = Group.create();
    const newWorkspace = Workspace.create(
      {
        name: `Database ${newIndex + 1}`,
        notes: NoteList.create([], group),
        folders: FolderList.create([], group),
        createdAt: new Date(),
      },
      group
    );

    workspaces.$jazz.push(newWorkspace);
    (me as LoadedAccountWithRoot).root.$jazz.set("activeWorkspaceIndex", newIndex);
    
    return newIndex;
  }, [me, isLoaded, workspaces]);

  // Remove a workspace by index
  const removeWorkspace = useCallback((index: number) => {
    if (!isLoaded || !workspaces?.$isLoaded) return;
    if (workspaces.length <= 1) {
      // Don't remove the last workspace - reset it instead
      const ws = workspaces[0];
      if (ws?.$isLoaded) {
        ws.$jazz.set("name", "Database 1");
      }
      return;
    }

    // Remove the workspace
    workspaces.$jazz.remove(index);

    // Adjust active index if needed
    const currentActive = (me as LoadedAccountWithRoot).root.activeWorkspaceIndex ?? 0;
    if (currentActive >= workspaces.length) {
      (me as LoadedAccountWithRoot).root.$jazz.set("activeWorkspaceIndex", workspaces.length - 1);
    } else if (currentActive === index && currentActive > 0) {
      (me as LoadedAccountWithRoot).root.$jazz.set("activeWorkspaceIndex", currentActive - 1);
    }
  }, [me, isLoaded, workspaces]);

  // Set active workspace
  const setActiveWorkspace = useCallback((index: number) => {
    if (!isLoaded) return;
    (me as LoadedAccountWithRoot).root.$jazz.set("activeWorkspaceIndex", index);
  }, [me, isLoaded]);

  // Rename a workspace
  const renameWorkspace = useCallback((index: number, name: string) => {
    if (!workspaces?.$isLoaded) return;
    const ws = workspaces[index];
    if (ws?.$isLoaded) {
      ws.$jazz.set("name", name);
    }
  }, [workspaces]);

  // Reorder workspaces
  const reorderWorkspaces = useCallback((fromIndex: number, toIndex: number) => {
    if (!isLoaded || !workspaces?.$isLoaded) return;
    
    // Get the workspace being moved
    const [movedWorkspace] = workspaces.$jazz.splice(fromIndex, 1);
    if (movedWorkspace) {
      workspaces.$jazz.splice(toIndex, 0, movedWorkspace);
    }

    // Update active index if it was affected
    const currentActive = (me as LoadedAccountWithRoot).root.activeWorkspaceIndex ?? 0;
    if (currentActive === fromIndex) {
      (me as LoadedAccountWithRoot).root.$jazz.set("activeWorkspaceIndex", toIndex);
    } else if (fromIndex < currentActive && toIndex >= currentActive) {
      (me as LoadedAccountWithRoot).root.$jazz.set("activeWorkspaceIndex", currentActive - 1);
    } else if (fromIndex > currentActive && toIndex <= currentActive) {
      (me as LoadedAccountWithRoot).root.$jazz.set("activeWorkspaceIndex", currentActive + 1);
    }
  }, [me, isLoaded, workspaces]);

  return {
    tabs,
    activeIndex,
    activeWorkspaceId,
    isLoaded,
    addWorkspace,
    removeWorkspace,
    setActiveWorkspace,
    renameWorkspace,
    reorderWorkspaces,
  };
}

// ============================================================================
// Note operations hook - works with the current workspace's notes
// ============================================================================

export interface UseWorkspaceNotesResult {
  /** All notes in the current workspace (not deleted) */
  notes: Array<{
    id: string;
    title: string;
    content: string | null;
    isPinned: boolean;
    noteType: string;
    tags: string | null;
    calculatorState: string | null;
    viewMode: string;
    folderId: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  /** All folders in the current workspace */
  folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  /** Whether data is loaded */
  isLoaded: boolean;
  
  // Note operations
  createNote: (title: string, noteType?: "text" | "calculator") => string | null;
  updateNote: (id: string, updates: { 
    title?: string; 
    content?: string; 
    isPinned?: boolean; 
    viewMode?: string; 
    tags?: string | null;
    calculatorState?: string | null;
    folderId?: string | null;
    sortOrder?: number;
  }) => void;
  deleteNote: (id: string) => void;
  
  // Folder operations
  createFolder: (name: string, parentId?: string) => string | null;
  updateFolder: (id: string, updates: { name?: string; sortOrder?: number }) => void;
  deleteFolder: (id: string) => void;
  
  // Settings
  lastSeenNoteId: string | null;
  setLastSeenNote: (noteId: string | null) => void;
}

export function useWorkspaceNotes(): UseWorkspaceNotesResult {
  // Load account
  const meRaw = useAccount();
  
  // Cast to our expected type
  const me = meRaw as unknown as LoadedAccountWithRoot | { $isLoaded: false };

  const isLoaded = me?.$isLoaded === true && me?.root?.$isLoaded === true;
  const workspaces = isLoaded ? me.root.workspaces : undefined;
  const activeIndex = isLoaded ? (me.root.activeWorkspaceIndex ?? 0) : 0;
  
  // Get active workspace
  const activeWorkspace = useMemo(() => {
    if (!workspaces?.$isLoaded) return null;
    return workspaces[activeIndex] ?? workspaces[0] ?? null;
  }, [workspaces, activeIndex]);

  // Get notes from active workspace, filter deleted
  const notes = useMemo(() => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.notes?.$isLoaded) return [];
    
    return activeWorkspace.notes
      .filter((note: LoadedNote) => note.$isLoaded && !note.deleted)
      .map((note: LoadedNote) => ({
        id: note.$jazz.id,
        title: note.title,
        content: note.content ?? null,
        isPinned: note.isPinned,
        noteType: note.noteType,
        tags: note.tags ?? null,
        calculatorState: note.calculatorState ?? null,
        viewMode: note.viewMode ?? "edit",
        folderId: note.folder?.$jazz?.id ?? null,
        sortOrder: note.sortOrder,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }))
      // Sort: pinned first, then by sortOrder
      .sort((a: { isPinned: boolean; sortOrder: number }, b: { isPinned: boolean; sortOrder: number }) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });
  }, [activeWorkspace]);

  // Get folders from active workspace
  const folders = useMemo(() => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.folders?.$isLoaded) return [];
    
    return activeWorkspace.folders
      .filter((folder: LoadedFolder) => folder.$isLoaded)
      .map((folder: LoadedFolder) => ({
        id: folder.$jazz.id,
        name: folder.name,
        parentId: folder.parentFolder?.$jazz?.id ?? null,
        sortOrder: folder.sortOrder,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      }));
  }, [activeWorkspace]);

  // Create a note
  const createNote = useCallback((title: string, noteType: "text" | "calculator" = "text") => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.notes?.$isLoaded) return null;

    const now = new Date();
    const group = Group.create();
    const newNote = Note.create(
      {
        title,
        content: "",
        noteType,
        isPinned: false,
        viewMode: "edit",
        tags: "",
        sortOrder: Date.now(),
        createdAt: now,
        updatedAt: now,
      },
      group
    );

    activeWorkspace.notes.$jazz.push(newNote);
    return (newNote as unknown as { $jazz: { id: string } }).$jazz.id;
  }, [activeWorkspace]);

  // Update a note
  const updateNote = useCallback((id: string, updates: { 
    title?: string; 
    content?: string; 
    isPinned?: boolean; 
    viewMode?: string; 
    tags?: string | null;
    calculatorState?: string | null;
    folderId?: string | null;
    sortOrder?: number;
  }) => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.notes?.$isLoaded) return;

    const note = activeWorkspace.notes.find((n: LoadedNote) => n.$isLoaded && n.$jazz.id === id);
    if (!note?.$isLoaded) return;

    if (updates.title !== undefined) note.$jazz.set("title", updates.title);
    if (updates.content !== undefined) note.$jazz.set("content", updates.content);
    if (updates.isPinned !== undefined) note.$jazz.set("isPinned", updates.isPinned);
    if (updates.viewMode !== undefined) note.$jazz.set("viewMode", updates.viewMode);
    if (updates.tags !== undefined) note.$jazz.set("tags", updates.tags ?? "");
    if (updates.calculatorState !== undefined) note.$jazz.set("calculatorState", updates.calculatorState ?? "");
    if (updates.sortOrder !== undefined) note.$jazz.set("sortOrder", updates.sortOrder);
    // TODO: Handle folderId update (need to find folder and set reference)
    
    // Update the updatedAt timestamp
    note.$jazz.set("updatedAt", new Date());
  }, [activeWorkspace]);

  // Delete a note (soft delete)
  const deleteNote = useCallback((id: string) => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.notes?.$isLoaded) return;

    const note = activeWorkspace.notes.find((n: LoadedNote) => n.$isLoaded && n.$jazz.id === id);
    if (note?.$isLoaded) {
      note.$jazz.set("deleted", true);
    }
  }, [activeWorkspace]);

  // Create a folder
  const createFolder = useCallback((name: string, _parentFolderId?: string) => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.folders?.$isLoaded) return null;

    const now = new Date();
    const group = Group.create();
    const newFolder = Folder.create(
      {
        name,
        sortOrder: Date.now(),
        createdAt: now,
        updatedAt: now,
      },
      group
    );

    activeWorkspace.folders.$jazz.push(newFolder);
    return (newFolder as unknown as { $jazz: { id: string } }).$jazz.id;
  }, [activeWorkspace]);

  // Update a folder
  const updateFolder = useCallback((id: string, updates: { name?: string; sortOrder?: number }) => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.folders?.$isLoaded) return;

    const folder = activeWorkspace.folders.find((f: LoadedFolder) => f.$isLoaded && f.$jazz.id === id);
    if (!folder?.$isLoaded) return;

    if (updates.name !== undefined) folder.$jazz.set("name", updates.name);
    if (updates.sortOrder !== undefined) folder.$jazz.set("sortOrder", updates.sortOrder);
    folder.$jazz.set("updatedAt", new Date());
  }, [activeWorkspace]);

  // Delete a folder
  const deleteFolder = useCallback((id: string) => {
    if (!activeWorkspace?.$isLoaded || !activeWorkspace.folders?.$isLoaded) return;

    const index = activeWorkspace.folders.findIndex((f: LoadedFolder) => f.$isLoaded && f.$jazz.id === id);
    if (index !== -1) {
      activeWorkspace.folders.$jazz.remove(index);
    }
  }, [activeWorkspace]);

  // Last seen note
  const lastSeenNoteId = useMemo(() => {
    if (!activeWorkspace?.$isLoaded) return null;
    return activeWorkspace.lastSeenNote?.$jazz?.id ?? null;
  }, [activeWorkspace]);

  const setLastSeenNote = useCallback((noteId: string | null) => {
    if (!activeWorkspace?.$isLoaded) return;

    if (noteId === null) {
      activeWorkspace.$jazz.delete("lastSeenNote");
    } else if (activeWorkspace.notes?.$isLoaded) {
      const note = activeWorkspace.notes.find((n: LoadedNote) => n.$isLoaded && n.$jazz.id === noteId);
      if (note?.$isLoaded) {
        activeWorkspace.$jazz.set("lastSeenNote", note);
      }
    }
  }, [activeWorkspace]);

  return {
    notes,
    folders,
    isLoaded,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
    lastSeenNoteId,
    setLastSeenNote,
  };
}
