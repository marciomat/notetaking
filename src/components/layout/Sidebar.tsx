"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  Trash2,
  PanelLeftClose,
  X,
  Pencil,
  Pin,
  Calculator,
  Search,
  Tag,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@evolu/react";
import * as Evolu from "@evolu/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { createFoldersQuery, createNotesQuery } from "@/lib/evolu";
import type { FolderId, NoteId } from "@/lib/evolu";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { useCurrentEvolu, useTabEvoluHook } from "@/components/app/TabContent";

// Type for active drag item info
interface ActiveDragItem {
  id: string;
  type: "note" | "folder";
  title: string;
  noteType?: string;
  isPinned?: boolean;
  folderId?: string | null; // null means item is at root level
}

export function Sidebar() {
  const evoluInstance = useCurrentEvolu();
  const { insert, update } = useTabEvoluHook();
  
  // Create queries using the current tab's evolu instance
  const foldersQuery = useMemo(() => createFoldersQuery(evoluInstance), [evoluInstance]);
  const notesQuery = useMemo(() => createNotesQuery(evoluInstance), [evoluInstance]);
  
  const folders = useQuery(foldersQuery);
  const notes = useQuery(notesQuery);
  const {
    selectedNoteId,
    selectedFolderId,
    setSelectedNoteId,
    setSelectedFolderId,
    setSidebarOpen,
    toggleSidebarCollapsed,
    tagFilter,
    addTagToFilter,
    removeTagFromFilter,
    clearTagFilter,
  } = useNoteStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "note" | "folder" | null;
    id: NoteId | FolderId | null;
    name: string;
  }>({
    open: false,
    type: null,
    id: null,
    name: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // dnd-kit drag state
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  
  // Track mount state for portal (SSR safety)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Set grabbing cursor on body when dragging for consistent UX
  useEffect(() => {
    if (activeDragItem) {
      document.body.style.cursor = 'grabbing';
      return () => {
        document.body.style.cursor = '';
      };
    }
  }, [activeDragItem]);

  // State for creating new items - shows input immediately before database insert
  const [creatingItem, setCreatingItem] = useState<{
    type: "note" | "folder" | "calculator";
    defaultName: string;
    name: string;
  } | null>(null);

  // Error state for duplicate names (for move operations - shown as dialog)
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Inline error for create/rename operations (shown below input)
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Helper to check if a note name already exists in a folder (case-insensitive)
  const noteNameExistsInFolder = useCallback(
    (name: string, folderId: FolderId | null, excludeNoteId?: NoteId): boolean => {
      const normalizedName = name.toLowerCase().trim();
      return notes.some(
        (note) =>
          note.id !== excludeNoteId &&
          note.folderId === folderId &&
          note.title.toLowerCase() === normalizedName
      );
    },
    [notes]
  );

  // Helper to check if a folder name already exists in a parent folder (case-insensitive)
  const folderNameExistsInParent = useCallback(
    (name: string, parentId: FolderId | null, excludeFolderId?: FolderId): boolean => {
      const normalizedName = name.toLowerCase().trim();
      return folders.some(
        (folder) =>
          folder.id !== excludeFolderId &&
          folder.parentId === parentId &&
          folder.name.toLowerCase() === normalizedName
      );
    },
    [folders]
  );

  // Callback ref to focus and select text when input is mounted
  const editInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      // Focus immediately when the input is mounted
      node.focus();
      node.select();
    }
  }, []);

  // Tag search state
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const tagSearchRef = useRef<HTMLInputElement>(null);

  // Helper to parse tags from JSON string
  const parseTags = useCallback((tagsJson: string | null): string[] => {
    if (!tagsJson) return [];
    try {
      const parsed = JSON.parse(tagsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  // Collect all unique tags from all notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
      parseTags(note.tags).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes, parseTags]);

  // Filter tag suggestions based on search query
  const tagSuggestions = useMemo(() => {
    if (!tagSearchQuery.trim()) return allTags.filter((tag) => !tagFilter.includes(tag));
    return allTags.filter(
      (tag) =>
        tag.toLowerCase().includes(tagSearchQuery.toLowerCase()) &&
        !tagFilter.includes(tag)
    );
  }, [tagSearchQuery, allTags, tagFilter]);

  // Custom collision detection that prioritizes folder drop zones over other items
  // This allows dropping into nested folders even when hovering over their contents
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // First, get collisions using pointerWithin (checks what's directly under pointer)
    const pointerCollisions = pointerWithin(args);
    
    // If we have collisions, prioritize folder drop zones
    if (pointerCollisions.length > 0) {
      // Find folder drop zones (they have ids like "folder-drop-xxx")
      const folderDropZones = pointerCollisions.filter(
        (collision) => String(collision.id).startsWith("folder-drop-")
      );
      
      // If hovering over a folder drop zone, use it
      if (folderDropZones.length > 0) {
        return folderDropZones;
      }
      
      // Check for sidebar-root
      const rootZone = pointerCollisions.filter(
        (collision) => collision.id === "sidebar-root"
      );
      if (rootZone.length > 0 && pointerCollisions.length === 1) {
        return rootZone;
      }
      
      return pointerCollisions;
    }
    
    // Fall back to closestCenter for keyboard navigation
    return closestCenter(args);
  }, []);

  // Configure dnd-kit sensors for both desktop and mobile
  // PointerSensor: 8px distance before activating (prevents accidental drags)
  // TouchSensor: 150ms delay with 5px tolerance for mobile
  // KeyboardSensor: accessible keyboard navigation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-expand parent folders when a note is selected
  useEffect(() => {
    if (!selectedNoteId) return;

    const selectedNote = notes.find((n) => n.id === selectedNoteId);
    if (!selectedNote?.folderId) return;

    // Build a map of folder IDs to their parent IDs for quick lookup
    const folderParentMap = new Map<string, string | null>();
    folders.forEach((folder) => {
      folderParentMap.set(folder.id, folder.parentId);
    });

    // Recursively find all parent folders
    const getParentFolderChain = (folderId: string): string[] => {
      const chain: string[] = [folderId];
      let currentId: string | null = folderId;

      while (currentId) {
        const parentId = folderParentMap.get(currentId);
        if (parentId) {
          chain.push(parentId);
          currentId = parentId;
        } else {
          break;
        }
      }

      return chain;
    };

    // Get all parent folders for the note's folder
    const foldersToExpand = getParentFolderChain(selectedNote.folderId);

    // Expand all parent folders
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      foldersToExpand.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedNoteId, notes, folders]);

  const startEdit = useCallback((id: string, currentName: string, e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setEditingId(id);
    setEditingName(currentName);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cancelEdit = useCallback((type: "note" | "folder") => {
    setEditingId(null);
    setEditingName("");
    setInlineError(null);
  }, []);

  const saveEdit = useCallback((id: string, type: "note" | "folder"): boolean => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      cancelEdit(type);
      return true;
    }

    const parsedName = Evolu.NonEmptyString100.from(trimmedName);
    if (!parsedName.ok) {
      setInlineError("Name is too long");
      return false;
    }

    // Check for duplicate names
    if (type === "folder") {
      const folder = folders.find((f) => f.id === id);
      if (folder && folderNameExistsInParent(trimmedName, folder.parentId, id as FolderId)) {
        setInlineError(`"${trimmedName}" already exists here`);
        return false;
      }
      update("folder", { id: id as FolderId, name: parsedName.value });
    } else {
      const note = notes.find((n) => n.id === id);
      if (note && noteNameExistsInFolder(trimmedName, note.folderId, id as NoteId)) {
        setInlineError(`"${trimmedName}" already exists in this folder`);
        return false;
      }
      update("note", { id: id as NoteId, title: parsedName.value });
    }

    setInlineError(null);
    setEditingId(null);
    setEditingName("");
    return true;
  }, [editingName, update, cancelEdit, folders, notes, folderNameExistsInParent, noteNameExistsInFolder]);


  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedFolderId(null);
    setSelectedNoteId(null);
  };

  const handleCreateNote = () => {
    // Expand parent folder if creating note inside a folder
    if (selectedFolderId) {
      setExpandedFolders((prev) => new Set(prev).add(selectedFolderId));
    }
    // Show input immediately - keyboard will appear because this is direct user interaction
    setCreatingItem({
      type: "note",
      defaultName: "Untitled Note",
      name: "Untitled Note",
    });
  };

  const handleCreateFolder = () => {
    // Expand parent folder if creating subfolder
    if (selectedFolderId) {
      setExpandedFolders((prev) => new Set(prev).add(selectedFolderId));
    }
    // Show input immediately - keyboard will appear because this is direct user interaction
    setCreatingItem({
      type: "folder",
      defaultName: "New Folder",
      name: "New Folder",
    });
  };

  const handleCreateCalculator = () => {
    // Expand parent folder if creating calculator inside a folder
    if (selectedFolderId) {
      setExpandedFolders((prev) => new Set(prev).add(selectedFolderId));
    }
    // Show input immediately - keyboard will appear because this is direct user interaction
    setCreatingItem({
      type: "calculator",
      defaultName: "Untitled Calculator",
      name: "Untitled Calculator",
    });
  };

  const saveCreatingItem = useCallback((): boolean => {
    if (!creatingItem) return true;

    const trimmedName = creatingItem.name.trim();
    const nameToUse = trimmedName || creatingItem.defaultName;
    const parsedName = Evolu.NonEmptyString100.from(nameToUse);

    if (!parsedName.ok) {
      setInlineError("Name is too long");
      return false;
    }

    // Check for duplicate names
    const typedFolderId = selectedFolderId as FolderId | null;
    if (creatingItem.type === "note" || creatingItem.type === "calculator") {
      if (noteNameExistsInFolder(nameToUse, typedFolderId)) {
        setInlineError(`"${nameToUse}" already exists in this folder`);
        return false;
      }

      const editMode = Evolu.NonEmptyString100.from("edit");
      const noteType = Evolu.NonEmptyString100.from(creatingItem.type);
      const result = insert("note", {
        title: parsedName.value,
        content: null,
        folderId: typedFolderId,
        viewMode: editMode.ok ? editMode.value : null,
        noteType: noteType.ok ? noteType.value : null,
      });
      if (result.ok) {
        setSelectedNoteId(result.value.id);
      }
    } else {
      if (folderNameExistsInParent(nameToUse, typedFolderId)) {
        setInlineError(`"${nameToUse}" already exists here`);
        return false;
      }

      insert("folder", {
        name: parsedName.value,
        parentId: typedFolderId,
      });
    }

    setInlineError(null);
    setCreatingItem(null);
    return true;
  }, [creatingItem, selectedFolderId, insert, setSelectedNoteId, noteNameExistsInFolder, folderNameExistsInParent]);

  const cancelCreatingItem = useCallback(() => {
    setCreatingItem(null);
    setInlineError(null);
  }, []);

  const handleDeleteNote = (note: (typeof notes)[number], e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setDeleteDialog({
      open: true,
      type: "note",
      id: note.id,
      name: note.title,
    });
  };

  const handleDeleteFolder = (folder: (typeof folders)[number], e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setDeleteDialog({
      open: true,
      type: "folder",
      id: folder.id,
      name: folder.name,
    });
  };

  const confirmDelete = () => {
    if (!deleteDialog.id || !deleteDialog.type) return;

    if (deleteDialog.type === "note") {
      update("note", { id: deleteDialog.id as NoteId, isDeleted: Evolu.sqliteTrue });
      if (selectedNoteId === deleteDialog.id) {
        setSelectedNoteId(null);
      }
    } else if (deleteDialog.type === "folder") {
      update("folder", { id: deleteDialog.id as FolderId, isDeleted: Evolu.sqliteTrue });
      if (selectedFolderId === deleteDialog.id) {
        setSelectedFolderId(null);
      }
    }

    setDeleteDialog({ open: false, type: null, id: null, name: "" });
  };

  // dnd-kit drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.itemType as "note" | "folder" | "calculator" | undefined;
    
    if (type === "note" || type === "calculator") {
      const note = notes.find((n) => n.id === active.id);
      if (note) {
        setActiveDragItem({
          id: active.id as string,
          type: "note",
          title: note.title,
          noteType: note.noteType ?? "note",
          isPinned: note.isPinned === Evolu.sqliteTrue,
          folderId: note.folderId,
        });
      }
    } else if (type === "folder") {
      const folder = folders.find((f) => f.id === active.id);
      if (folder) {
        setActiveDragItem({
          id: active.id as string,
          type: "folder",
          title: folder.name,
        });
      }
    }
  }, [notes, folders]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragItem(null);
    setOverId(null);

    if (!over) return;

    const activeType = active.data.current?.itemType as string | undefined;
    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle note/calculator drop
    if (activeType === "note" || activeType === "calculator") {
      const note = notes.find((n) => n.id === activeId);
      if (!note) return;

      // Determine target folder
      let targetFolderId: FolderId | null = null;
      
      if (overId === "sidebar-root") {
        targetFolderId = null;
      } else if (overId.startsWith("folder-drop-")) {
        targetFolderId = overId.replace("folder-drop-", "") as FolderId;
      } else {
        // Check if dropping on a folder item
        const targetFolder = folders.find((f) => f.id === overId);
        if (targetFolder) {
          targetFolderId = targetFolder.id;
        } else {
          // Dropping on another note - use that note's folder
          const targetNote = notes.find((n) => n.id === overId);
          if (targetNote) {
            targetFolderId = targetNote.folderId;
          }
        }
      }

      // Only update if actually changing folders
      if (note.folderId !== targetFolderId) {
        // Check for duplicate name in target folder
        if (noteNameExistsInFolder(note.title, targetFolderId, activeId as NoteId)) {
          setDuplicateError(`A note named "${note.title}" already exists in the destination folder`);
          return;
        }

        update("note", { id: activeId as NoteId, folderId: targetFolderId });

        // Expand the target folder if dropping into one
        if (targetFolderId) {
          setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
        }
      }
    }
  }, [notes, folders, update, noteNameExistsInFolder]);

  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null);
    setOverId(null);
  }, []);

  // Helper to check if a note matches the tag filter
  const noteMatchesTagFilter = useCallback((note: typeof notes[number]): boolean => {
    if (tagFilter.length === 0) return true;
    const noteTags = parseTags(note.tags);
    // Note must have ALL selected tags (AND logic)
    return tagFilter.every((filterTag) => noteTags.includes(filterTag));
  }, [tagFilter, parseTags]);

  // Helper to check if a folder contains any matching notes (recursively)
  const folderHasMatchingNotes = useCallback((folderId: FolderId): boolean => {
    // Check direct notes in this folder
    const directNotes = notes.filter((n) => n.folderId === folderId);
    if (directNotes.some(noteMatchesTagFilter)) return true;

    // Check subfolders recursively
    const subfolders = folders.filter((f) => f.parentId === folderId);
    return subfolders.some((subfolder) => folderHasMatchingNotes(subfolder.id));
  }, [notes, folders, noteMatchesTagFilter]);

  // Get root folders (no parent) - filter out empty folders when tag filter is active
  const rootFolders = useMemo(() => {
    const allRootFolders = folders.filter((f) => f.parentId === null);
    if (tagFilter.length === 0) return allRootFolders;
    return allRootFolders.filter((f) => folderHasMatchingNotes(f.id));
  }, [folders, tagFilter, folderHasMatchingNotes]);

  // Get notes without folder (filtered by tags)
  const rootNotes = useMemo(() =>
    notes.filter((n) => n.folderId === null && noteMatchesTagFilter(n)),
    [notes, noteMatchesTagFilter]
  );

  // Get subfolders for a parent - filter out empty folders when tag filter is active
  const getSubfolders = useCallback((parentId: FolderId) => {
    const allSubfolders = folders.filter((f) => f.parentId === parentId);
    if (tagFilter.length === 0) return allSubfolders;
    return allSubfolders.filter((f) => folderHasMatchingNotes(f.id));
  }, [folders, tagFilter, folderHasMatchingNotes]);

  // Get notes in a folder (filtered by tags)
  const getNotesInFolder = useCallback((folderId: FolderId) =>
    notes.filter((n) => n.folderId === folderId && noteMatchesTagFilter(n)),
    [notes, noteMatchesTagFilter]
  );

  const renderFolder = (folder: (typeof folders)[number], depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = getSubfolders(folder.id);
    const folderNotes = getNotesInFolder(folder.id);
    const hasChildren = subfolders.length > 0 || folderNotes.length > 0;

    const handleSelect = () => {
      setSelectedFolderId(folder.id);
      setSelectedNoteId(null);
      if (hasChildren) {
        toggleFolder(folder.id);
      }
    };

    // Check if this folder is being hovered as a drop target
    const isDropTarget = overId === folder.id || overId === `folder-drop-${folder.id}`;

    return (
      <DroppableFolderItem
        key={folder.id}
        folder={folder}
        depth={depth}
        isExpanded={isExpanded}
        isSelected={selectedFolderId === folder.id}
        isDropTarget={isDropTarget && activeDragItem !== null}
        isEditing={editingId === folder.id}
        editingName={editingName}
        inlineError={inlineError}
        hasChildren={hasChildren}
        onSelect={handleSelect}
        onStartEdit={(e) => startEdit(folder.id, folder.name, e)}
        onDelete={(e) => handleDeleteFolder(folder, e)}
        onEditingNameChange={(name) => {
          setEditingName(name);
          setInlineError(null);
        }}
        onSaveEdit={() => saveEdit(folder.id, "folder")}
        onCancelEdit={() => cancelEdit("folder")}
        editInputRef={editInputRef}
      >
        {isExpanded && (
          <>
            {/* Creating new item input - shown inside folder when this folder is selected */}
            {creatingItem && selectedFolderId === folder.id && (
              <div className="space-y-1">
                <div
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-accent"
                  style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}
                >
                  {creatingItem.type === "folder" ? (
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : creatingItem.type === "calculator" ? (
                    <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <Input
                    ref={editInputRef}
                    value={creatingItem.name}
                    onChange={(e) => {
                      setCreatingItem((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      );
                      setInlineError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveCreatingItem();
                      } else if (e.key === "Escape") {
                        cancelCreatingItem();
                      }
                    }}
                    onBlur={(e) => {
                      const success = saveCreatingItem();
                      if (!success) {
                        // Refocus on error
                        e.target.focus();
                      }
                    }}
                    className={cn("h-6 flex-1 text-sm", inlineError && "border-destructive")}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {inlineError && (
                  <p
                    className="text-xs text-destructive px-2"
                    style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}
                  >
                    {inlineError}
                  </p>
                )}
              </div>
            )}
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}
            {folderNotes.map((note) => renderNote(note, depth + 1))}
          </>
        )}
      </DroppableFolderItem>
    );
  };

  const renderNote = (note: (typeof notes)[number], depth = 0) => {
    return (
      <SortableNoteItem
        key={note.id}
        note={note}
        depth={depth}
        isSelected={selectedNoteId === note.id}
        isDragging={activeDragItem?.id === note.id}
        isEditing={editingId === note.id}
        editingName={editingName}
        inlineError={inlineError}
        onSelect={() => {
          setSelectedNoteId(note.id);
          setSelectedFolderId(note.folderId);
        }}
        onStartEdit={(e) => startEdit(note.id, note.title, e)}
        onDelete={(e) => handleDeleteNote(note, e)}
        onEditingNameChange={(name) => {
          setEditingName(name);
          setInlineError(null);
        }}
        onSaveEdit={() => saveEdit(note.id, "note")}
        onCancelEdit={() => cancelEdit("note")}
        editInputRef={editInputRef}
      />
    );
  };

  // Get all item IDs for SortableContext
  // Include sidebar-root and ALL notes/folders so drag works consistently everywhere
  const allItemIds = useMemo(() => {
    const ids: string[] = ["sidebar-root"];
    // Include all folders
    folders.forEach((f) => ids.push(f.id));
    // Include all notes
    notes.forEach((n) => ids.push(n.id));
    return ids;
  }, [folders, notes]);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <TooltipProvider>
          <aside
            className="flex h-full w-full shrink-0 flex-col border-r border-border bg-background"
        >
          {/* Sidebar header */}
          <div className="flex h-10 items-center justify-between px-3">
            <div className="flex items-center gap-2 flex-1" onClick={clearSelection}>
              {/* Desktop: Collapse button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hidden md:flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSidebarCollapsed();
                    }}
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse Sidebar</TooltipContent>
              </Tooltip>

            {/* Mobile: Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 md:hidden"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(false);
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close sidebar</span>
            </Button>

            <span className="text-xs font-medium uppercase text-muted-foreground cursor-pointer">
              Notes
            </span>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCreateNote}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Note</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCreateCalculator}
                >
                  <Calculator className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Calculator</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCreateFolder}
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tag filter search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={tagSearchRef}
              value={tagSearchQuery}
              onChange={(e) => {
                setTagSearchQuery(e.target.value);
                setShowTagSuggestions(true);
                setSelectedSuggestionIndex(0);
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowTagSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagSuggestions.length > 0) {
                  e.preventDefault();
                  addTagToFilter(tagSuggestions[selectedSuggestionIndex]);
                  setTagSearchQuery("");
                  setShowTagSuggestions(false);
                } else if (e.key === "Escape") {
                  setShowTagSuggestions(false);
                  setTagSearchQuery("");
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedSuggestionIndex((prev) =>
                    prev < tagSuggestions.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
                }
              }}
              placeholder="Filter by tags..."
              className="h-8 pl-7 text-xs"
            />

            {/* Tag suggestions dropdown */}
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-40 overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {tagSuggestions.slice(0, 10).map((tag, index) => (
                  <button
                    key={tag}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent",
                      index === selectedSuggestionIndex && "bg-accent"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTagToFilter(tag);
                      setTagSearchQuery("");
                      setShowTagSuggestions(false);
                    }}
                  >
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active tag filters */}
          {tagFilter.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tagFilter.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs cursor-pointer"
                  onClick={() => removeTagFromFilter(tag)}
                >
                  {tag}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {tagFilter.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs text-muted-foreground"
                  onClick={clearTagFilter}
                >
                  Clear all
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Notes and folders list */}
        <ScrollArea className="flex-1" onClick={(e) => {
          // Clear selection if clicking on empty area
          const target = e.target as HTMLElement;
          // Check if click is on ScrollArea viewport or the container div (not on items)
          if (target.hasAttribute('data-radix-scroll-area-viewport') ||
              target.classList.contains('sidebar-container')) {
            clearSelection();
          }
        }}>
          <RootDropZone
            isActive={overId === "sidebar-root" && activeDragItem !== null}
          >
            <div
              ref={sidebarContainerRef}
              className="p-2 min-h-full sidebar-container"
            >
              <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
                {/* Show "Move to Root" drop zone only when dragging an item that's inside a folder */}
                {activeDragItem && activeDragItem.type === "note" && activeDragItem.folderId && (
                  <div
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed py-2 mb-2 text-sm transition-colors",
                      overId === "sidebar-root"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Drop here to move to root level</span>
                  </div>
                )}
                
                {/* Creating new item input - shown at root level when no folder is selected */}
                {creatingItem && !selectedFolderId && (
                  <div className="space-y-1">
                    <div
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-accent"
                      style={{ paddingLeft: "28px" }}
                    >
                      {creatingItem.type === "folder" ? (
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : creatingItem.type === "calculator" ? (
                        <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <Input
                        ref={editInputRef}
                        value={creatingItem.name}
                        onChange={(e) => {
                          setCreatingItem((prev) =>
                            prev ? { ...prev, name: e.target.value } : null
                          );
                          setInlineError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveCreatingItem();
                          } else if (e.key === "Escape") {
                            cancelCreatingItem();
                          }
                        }}
                        onBlur={(e) => {
                          const success = saveCreatingItem();
                          if (!success) {
                            // Refocus on error
                            e.target.focus();
                          }
                        }}
                        className={cn("h-6 flex-1 text-sm", inlineError && "border-destructive")}
                        onClick={(e) => e.stopPropagation()}
                      />
                </div>
                {inlineError && (
                  <p className="text-xs text-destructive px-2" style={{ paddingLeft: "28px" }}>
                    {inlineError}
                  </p>
                )}
              </div>
            )}

            {/* Root folders */}
            {rootFolders.map((folder) => renderFolder(folder))}

            {/* Root notes (without folder) */}
            {rootNotes.map((note) => renderNote(note))}

            {/* Empty state / root drop zone indicator when dragging */}
            {rootFolders.length === 0 && rootNotes.length === 0 && !creatingItem && (
              <div 
                className={cn(
                  "flex flex-col items-center justify-center py-8 text-center rounded-lg border-2 border-dashed transition-colors",
                  activeDragItem 
                    ? overId === "sidebar-root"
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/30"
                    : "border-transparent"
                )}
              >
                {activeDragItem ? (
                  <>
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drop here to move to root
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No notes yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click + to create one
                    </p>
                  </>
                )}
              </div>
            )}
              </SortableContext>
            </div>
          </RootDropZone>
        </ScrollArea>
        </aside>
        </TooltipProvider>
        {/* Drag overlay - use portal to render at viewport level for correct positioning */}
        {isMounted && createPortal(
          <DragOverlay dropAnimation={null}>
            {activeDragItem ? (
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-background border shadow-lg cursor-grabbing">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                {activeDragItem.isPinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
                {activeDragItem.type === "folder" ? (
                  <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : activeDragItem.noteType === "calculator" ? (
                  <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">{activeDragItem.title}</span>
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, type: null, id: null, name: "" });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.name}&quot;?
              {deleteDialog.type === "folder" && " All notes inside this folder will also be deleted."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate name error dialog (for move operations) */}
      <AlertDialog
        open={duplicateError !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicateError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Move Item</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateError(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Droppable root zone component
function RootDropZone({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  const { setNodeRef } = useDroppable({
    id: "sidebar-root",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-full",
        isActive && "bg-primary/10"
      )}
    >
      {children}
    </div>
  );
}

// Droppable folder item component
interface DroppableFolderItemProps {
  folder: {
    id: string;
    name: string;
  };
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isDropTarget: boolean;
  isEditing: boolean;
  editingName: string;
  inlineError: string | null;
  hasChildren: boolean;
  children?: React.ReactNode;
  onSelect: () => void;
  onStartEdit: (e?: React.MouseEvent | React.TouchEvent) => void;
  onDelete: (e?: React.MouseEvent | React.TouchEvent) => void;
  onEditingNameChange: (name: string) => void;
  onSaveEdit: () => boolean;
  onCancelEdit: () => void;
  editInputRef: (node: HTMLInputElement | null) => void;
}

function DroppableFolderItem({
  folder,
  depth,
  isExpanded,
  isSelected,
  isDropTarget,
  isEditing,
  editingName,
  inlineError,
  hasChildren,
  children,
  onSelect,
  onStartEdit,
  onDelete,
  onEditingNameChange,
  onSaveEdit,
  onCancelEdit,
  editInputRef,
}: DroppableFolderItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-drop-${folder.id}`,
    data: { type: "folder", folderId: folder.id },
  });

  return (
    <div ref={setNodeRef}>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent active:bg-accent",
          isSelected && "bg-accent",
          (isDropTarget || isOver) && "bg-primary/20 ring-2 ring-primary ring-inset"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={onSelect}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        {isEditing ? (
          <Input
            ref={editInputRef}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveEdit();
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            onBlur={(e) => {
              const success = onSaveEdit();
              if (!success) {
                e.target.focus();
              }
            }}
            className={cn("h-6 flex-1 text-sm", inlineError && "border-destructive")}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(e);
          }}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>

      {/* Inline error for folder rename */}
      {isEditing && inlineError && (
        <p
          className="text-xs text-destructive px-2 py-1"
          style={{ paddingLeft: `${depth * 12 + 28}px` }}
        >
          {inlineError}
        </p>
      )}

      {children}
    </div>
  );
}

// Sortable note item component
interface SortableNoteItemProps {
  note: {
    id: string;
    title: string;
    noteType: string | null;
    isPinned: number | null;
    folderId: string | null;
  };
  depth: number;
  isSelected: boolean;
  isDragging: boolean;
  isEditing: boolean;
  editingName: string;
  inlineError: string | null;
  onSelect: () => void;
  onStartEdit: (e?: React.MouseEvent | React.TouchEvent) => void;
  onDelete: (e?: React.MouseEvent | React.TouchEvent) => void;
  onEditingNameChange: (name: string) => void;
  onSaveEdit: () => boolean;
  onCancelEdit: () => void;
  editInputRef: (node: HTMLInputElement | null) => void;
}

function SortableNoteItem({
  note,
  depth,
  isSelected,
  isDragging,
  isEditing,
  editingName,
  inlineError,
  onSelect,
  onStartEdit,
  onDelete,
  onEditingNameChange,
  onSaveEdit,
  onCancelEdit,
  editInputRef,
}: SortableNoteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: note.id,
    data: {
      type: "note",
      itemType: note.noteType || "note",
      folderId: note.folderId,
    },
    disabled: isEditing,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };

  // Use local sqliteTrue value (1)
  const isPinned = note.isPinned === 1;

  return (
    <React.Fragment>
      <div
        ref={setNodeRef}
        style={{ ...style, paddingLeft: `${depth * 12 + 28}px` }}
        className={cn(
          "group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent active:bg-accent select-none",
          isSelected && "bg-accent",
          (isDragging || isSortableDragging) && "opacity-50 z-50"
        )}
        onClick={onSelect}
        {...attributes}
        {...listeners}
      >
        {/* Pin icon - always visible when note is pinned, before note icon */}
        {isPinned && (
          <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        {note.noteType === "calculator" ? (
          <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        {isEditing ? (
          <Input
            ref={editInputRef}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveEdit();
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            onBlur={(e) => {
              const success = onSaveEdit();
              if (!success) {
                e.target.focus();
              }
            }}
            className={cn("h-6 flex-1 text-sm", inlineError && "border-destructive")}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate pointer-events-none">{note.title}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(e);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      {/* Inline error for note rename */}
      {isEditing && inlineError && (
        <p
          className="text-xs text-destructive px-2 py-1"
          style={{ paddingLeft: `${depth * 12 + 28}px` }}
        >
          {inlineError}
        </p>
      )}
    </React.Fragment>
  );
}
