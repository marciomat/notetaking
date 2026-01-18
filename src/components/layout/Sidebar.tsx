"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Plus,
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
} from "lucide-react";
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
import { useEvolu, foldersQuery, notesQuery } from "@/lib/evolu";
import type { FolderId, NoteId } from "@/lib/evolu";
import { useNoteStore } from "@/lib/hooks/useNoteStore";

export function Sidebar() {
  const { insert, update } = useEvolu();
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

  // Drag and drop state
  const [draggedNoteId, setDraggedNoteId] = useState<NoteId | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<FolderId | "root" | null>(null);

  // Touch drag state
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartNoteRef = useRef<NoteId | null>(null);
  const hasDraggedRef = useRef(false); // True if dragging (horizontal)
  const hasScrolledRef = useRef(false); // True if scrolling (vertical)
  const touchHandledRef = useRef(false); // Prevent click after touch
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  const folderElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // State for creating new items - shows input immediately before database insert
  const [creatingItem, setCreatingItem] = useState<{
    type: "note" | "folder" | "calculator";
    defaultName: string;
    name: string;
  } | null>(null);

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


  // Prevent scrolling on entire page when touch dragging
  useEffect(() => {
    if (!isTouchDragging) return;

    const preventScroll = (e: TouchEvent) => {
      // Only prevent default to stop scrolling, don't stop propagation
      // so our touch handlers can still detect folder positions
      e.preventDefault();
    };

    // Add listener with passive: false to allow preventDefault
    document.addEventListener("touchmove", preventScroll, { passive: false });
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("touchmove", preventScroll);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isTouchDragging]);

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

  const cancelEdit = useCallback((type: "note" | "folder") => {
    setEditingId(null);
    setEditingName("");
  }, []);

  const saveEdit = useCallback((id: string, type: "note" | "folder") => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      cancelEdit(type);
      return;
    }

    const parsedName = Evolu.NonEmptyString100.from(trimmedName);
    if (!parsedName.ok) {
      cancelEdit(type);
      return;
    }

    if (type === "folder") {
      update("folder", { id: id as FolderId, name: parsedName.value });
    } else {
      update("note", { id: id as NoteId, title: parsedName.value });
    }

    setEditingId(null);
    setEditingName("");
  }, [editingName, update, cancelEdit]);


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

  const saveCreatingItem = useCallback(() => {
    if (!creatingItem) return;

    const trimmedName = creatingItem.name.trim();
    const nameToUse = trimmedName || creatingItem.defaultName;
    const parsedName = Evolu.NonEmptyString100.from(nameToUse);

    if (!parsedName.ok) {
      setCreatingItem(null);
      return;
    }

    if (creatingItem.type === "note" || creatingItem.type === "calculator") {
      const editMode = Evolu.NonEmptyString100.from("edit");
      const noteType = Evolu.NonEmptyString100.from(creatingItem.type);
      const result = insert("note", {
        title: parsedName.value,
        content: null,
        folderId: selectedFolderId,
        viewMode: editMode.ok ? editMode.value : null,
        noteType: noteType.ok ? noteType.value : null,
      });
      if (result.ok) {
        setSelectedNoteId(result.value.id);
      }
    } else {
      insert("folder", {
        name: parsedName.value,
        parentId: selectedFolderId,
      });
    }

    setCreatingItem(null);
  }, [creatingItem, selectedFolderId, insert, setSelectedNoteId]);

  const cancelCreatingItem = useCallback(() => {
    setCreatingItem(null);
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

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, noteId: NoteId) => {
    setDraggedNoteId(noteId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedNoteId(null);
    setDropTargetFolderId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, folderId: FolderId | "root") => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropTargetFolderId(folderId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we're leaving to something outside (not a child element)
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetFolderId(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetFolderId: FolderId | "root") => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNoteId) return;

    const note = notes.find((n) => n.id === draggedNoteId);
    if (!note) return;

    // Determine new folder ID (null for root)
    const newFolderId = targetFolderId === "root" ? null : targetFolderId;

    // Only update if actually changing folders
    if (note.folderId !== newFolderId) {
      update("note", { id: draggedNoteId, folderId: newFolderId });

      // Expand the target folder if dropping into one
      if (newFolderId) {
        setExpandedFolders((prev) => new Set(prev).add(newFolderId));
      }
    }

    setDraggedNoteId(null);
    setDropTargetFolderId(null);
  }, [draggedNoteId, notes, update]);

  // Touch drag handlers for mobile - drag starts immediately on touch
  const handleTouchStart = useCallback((e: React.TouchEvent, noteId: NoteId) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchStartNoteRef.current = noteId;
    hasDraggedRef.current = false;
    hasScrolledRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startPos = touchStartPosRef.current;
    const noteId = touchStartNoteRef.current;

    if (!startPos || !noteId) return;

    const dx = Math.abs(touch.clientX - startPos.x);
    const dy = Math.abs(touch.clientY - startPos.y);

    // Detect scrolling (vertical movement) - prevents selection on touchEnd
    if (dy > 10 && dy > dx) {
      hasScrolledRef.current = true;
    }

    // Start dragging only on HORIZONTAL movement (>10px)
    // Vertical movement is for scrolling the sidebar
    if (!isTouchDragging && dx > 10 && dx > dy) {
      setDraggedNoteId(noteId);
      setIsTouchDragging(true);
      hasDraggedRef.current = true;
      // Vibrate to indicate drag started (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }

    // If we're touch dragging, find the drop target under the touch point
    if (isTouchDragging || hasDraggedRef.current) {
      e.preventDefault(); // Prevent scrolling while dragging

      // Find element under touch point
      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!elementUnderTouch) {
        setDropTargetFolderId("root");
        return;
      }

      // Check if we're over a folder
      let foundFolder = false;
      folderElementsRef.current.forEach((element, folderId) => {
        if (element.contains(elementUnderTouch)) {
          setDropTargetFolderId(folderId as FolderId);
          foundFolder = true;
        }
      });

      if (!foundFolder) {
        // Check if we're over the sidebar container (root drop target)
        if (sidebarContainerRef.current?.contains(elementUnderTouch)) {
          setDropTargetFolderId("root");
        } else {
          setDropTargetFolderId(null);
        }
      }
    }
  }, [isTouchDragging, draggedNoteId]);

  const handleTouchEnd = useCallback(() => {
    // Mark that touch handled this interaction (prevents click from firing)
    touchHandledRef.current = true;
    // Reset after a short delay to allow future clicks
    setTimeout(() => {
      touchHandledRef.current = false;
    }, 100);

    // If we dragged, handle the drop
    if (isTouchDragging && draggedNoteId && dropTargetFolderId) {
      const note = notes.find((n) => n.id === draggedNoteId);
      if (note) {
        const newFolderId = dropTargetFolderId === "root" ? null : dropTargetFolderId;

        if (note.folderId !== newFolderId) {
          update("note", { id: draggedNoteId, folderId: newFolderId });

          if (newFolderId) {
            setExpandedFolders((prev) => new Set(prev).add(newFolderId));
          }
        }
      }
    }

    // If we didn't drag or scroll, this was a tap - select the note
    const noteId = touchStartNoteRef.current;
    if (!hasDraggedRef.current && !hasScrolledRef.current && noteId) {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        setSelectedNoteId(noteId);
        setSelectedFolderId(note.folderId);
      }
    }

    setDraggedNoteId(null);
    setDropTargetFolderId(null);
    setIsTouchDragging(false);
    touchStartPosRef.current = null;
    touchStartNoteRef.current = null;
    hasDraggedRef.current = false;
    hasScrolledRef.current = false;
  }, [isTouchDragging, draggedNoteId, dropTargetFolderId, notes, update, setSelectedNoteId, setSelectedFolderId]);

  const handleTouchCancel = useCallback(() => {
    setDraggedNoteId(null);
    setDropTargetFolderId(null);
    setIsTouchDragging(false);
    touchStartPosRef.current = null;
    touchStartNoteRef.current = null;
    hasDraggedRef.current = false;
    hasScrolledRef.current = false;
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
      // Skip if touch already handled this interaction
      if (touchHandledRef.current) return;
      setSelectedFolderId(folder.id);
      setSelectedNoteId(null);
      if (hasChildren) {
        toggleFolder(folder.id);
      }
    };

    const isDropTarget = dropTargetFolderId === folder.id;

    // Register folder element ref for touch drag detection
    const registerFolderRef = (el: HTMLDivElement | null) => {
      if (el) {
        folderElementsRef.current.set(folder.id, el);
      } else {
        folderElementsRef.current.delete(folder.id);
      }
    };

    return (
      <div key={folder.id} ref={registerFolderRef}>
        <div
          className={cn(
            "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent active:bg-accent",
            // Allow vertical scrolling
            isTouchDragging ? "touch-none" : "[touch-action:pan-y]",
            selectedFolderId === folder.id && "bg-accent",
            isDropTarget && draggedNoteId && "bg-primary/20 ring-2 ring-primary ring-inset"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
            hasScrolledRef.current = false;
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const startPos = touchStartPosRef.current;
            if (!startPos) return;
            const dy = Math.abs(touch.clientY - startPos.y);
            if (dy > 10) {
              hasScrolledRef.current = true;
            }
          }}
          onTouchEnd={(e) => {
            // Don't select if scrolling or dragging
            if (!isTouchDragging && !hasScrolledRef.current) {
              e.preventDefault();
              // Mark that touch handled this interaction
              touchHandledRef.current = true;
              setTimeout(() => {
                touchHandledRef.current = false;
              }, 100);
              setSelectedFolderId(folder.id);
              setSelectedNoteId(null);
              if (hasChildren) {
                toggleFolder(folder.id);
              }
            }
            hasScrolledRef.current = false;
            touchStartPosRef.current = null;
          }}
          onClick={handleSelect}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
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
          {editingId === folder.id ? (
            <Input
              ref={editInputRef}
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveEdit(folder.id, "folder");
                } else if (e.key === "Escape") {
                  cancelEdit("folder");
                }
              }}
              onBlur={() => saveEdit(folder.id, "folder")}
              className="h-6 flex-1 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate">{folder.name}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => startEdit(folder.id, folder.name, e)}
            onTouchEnd={(e) => {
              e.preventDefault();
              startEdit(folder.id, folder.name, e);
            }}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => handleDeleteFolder(folder, e)}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleDeleteFolder(folder, e);
            }}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>

        {isExpanded && (
          <>
            {/* Creating new item input - shown inside folder when this folder is selected */}
            {creatingItem && selectedFolderId === folder.id && (
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
                  onChange={(e) =>
                    setCreatingItem((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveCreatingItem();
                    } else if (e.key === "Escape") {
                      cancelCreatingItem();
                    }
                  }}
                  onBlur={saveCreatingItem}
                  className="h-6 flex-1 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}
            {folderNotes.map((note) => renderNote(note, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const renderNote = (note: (typeof notes)[number], depth = 0) => {
    const handleSelect = () => {
      // Skip if touch already handled this interaction
      if (touchHandledRef.current) return;
      setSelectedNoteId(note.id);
      setSelectedFolderId(note.folderId);
    };

    const isDragging = draggedNoteId === note.id;

    return (
      <div
        key={note.id}
        className={cn(
          "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent active:bg-accent",
          // Allow vertical scrolling (pan-y), but we handle horizontal drag ourselves
          isTouchDragging ? "touch-none" : "[touch-action:pan-y]",
          selectedNoteId === note.id && "bg-accent",
          isDragging && "opacity-50 scale-105 z-10 relative",
          isTouchDragging && isDragging && "shadow-lg bg-accent"
        )}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
        draggable={!isTouchDragging}
        onDragStart={(e) => handleDragStart(e, note.id)}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(e, note.id)}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleTouchEnd();
        }}
        onTouchCancel={handleTouchCancel}
        onClick={handleSelect}
      >
      {/* Pin icon - always visible when note is pinned, before note icon */}
      {note.isPinned === Evolu.sqliteTrue && (
        <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
      {note.noteType === "calculator" ? (
        <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      {editingId === note.id ? (
        <Input
          ref={editInputRef}
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              saveEdit(note.id, "note");
            } else if (e.key === "Escape") {
              cancelEdit("note");
            }
          }}
          onBlur={() => saveEdit(note.id, "note")}
          className="h-6 flex-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate">{note.title}</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        onClick={(e) => startEdit(note.id, note.title, e)}
        onTouchEnd={(e) => {
          e.preventDefault();
          startEdit(note.id, note.title, e);
        }}
      >
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        onClick={(e) => handleDeleteNote(note, e)}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleDeleteNote(note, e);
        }}
      >
        <Trash2 className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
    );
  };

  return (
    <TooltipProvider>
      <aside
        className="flex h-full w-full shrink-0 flex-col border-r border-border bg-background"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
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
        <ScrollArea className={cn("flex-1", isTouchDragging && "touch-none")} onClick={(e) => {
          // Clear selection if clicking on empty area
          const target = e.target as HTMLElement;
          // Check if click is on ScrollArea viewport or the container div (not on items)
          if (target.hasAttribute('data-radix-scroll-area-viewport') ||
              target.classList.contains('sidebar-container')) {
            clearSelection();
          }
        }}>
          <div
            ref={sidebarContainerRef}
            className={cn(
              "p-2 min-h-full sidebar-container",
              dropTargetFolderId === "root" && draggedNoteId && "bg-primary/10",
              isTouchDragging && "touch-none" // Prevent scrolling while dragging
            )}
            onDragOver={(e) => handleDragOver(e, "root")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "root")}
          >
            {/* Creating new item input - shown at root level when no folder is selected */}
            {creatingItem && !selectedFolderId && (
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
                  onChange={(e) =>
                    setCreatingItem((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveCreatingItem();
                    } else if (e.key === "Escape") {
                      cancelCreatingItem();
                    }
                  }}
                  onBlur={saveCreatingItem}
                  className="h-6 flex-1 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Root folders */}
            {rootFolders.map((folder) => renderFolder(folder))}

            {/* Root notes (without folder) */}
            {rootNotes.map((note) => renderNote(note))}

            {/* Empty state */}
            {rootFolders.length === 0 && rootNotes.length === 0 && !creatingItem && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No notes yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Click + to create one
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Touch drag indicator */}
      {isTouchDragging && draggedNoteId && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
          <span>Drop on folder to move</span>
        </div>
      )}

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
              {deleteDialog.type === "folder" && " This will also delete all notes inside this folder."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
