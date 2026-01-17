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
} from "lucide-react";
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
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
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

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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
    // Close sidebar on mobile if canceling note edit
    if (type === "note" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

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
      // Close sidebar on mobile after finishing editing a note
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }

    setEditingId(null);
    setEditingName("");
  }, [editingName, update, setSidebarOpen, cancelEdit]);

  // Close sidebar on mobile after selecting a note
  const closeSidebarOnMobile = useCallback(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

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
        // Close sidebar on mobile after creating note
        if (window.innerWidth < 768) {
          setSidebarOpen(false);
        }
      }
    } else {
      insert("folder", {
        name: parsedName.value,
        parentId: selectedFolderId,
      });
    }

    setCreatingItem(null);
  }, [creatingItem, selectedFolderId, insert, setSelectedNoteId, setSidebarOpen]);

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

  // Touch drag handlers for mobile
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, noteId: NoteId) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    // Start long press timer (500ms)
    longPressTimerRef.current = setTimeout(() => {
      setDraggedNoteId(noteId);
      setIsTouchDragging(true);
      // Vibrate to indicate drag started (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startPos = touchStartPosRef.current;

    // If moved too much before long press triggered, cancel
    if (startPos && !isTouchDragging) {
      const dx = Math.abs(touch.clientX - startPos.x);
      const dy = Math.abs(touch.clientY - startPos.y);
      if (dx > 10 || dy > 10) {
        clearLongPressTimer();
        return;
      }
    }

    // If we're touch dragging, find the drop target under the touch point
    if (isTouchDragging && draggedNoteId) {
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
  }, [isTouchDragging, draggedNoteId, clearLongPressTimer]);

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer();

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

    setDraggedNoteId(null);
    setDropTargetFolderId(null);
    setIsTouchDragging(false);
    touchStartPosRef.current = null;
  }, [isTouchDragging, draggedNoteId, dropTargetFolderId, notes, update, clearLongPressTimer]);

  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    setDraggedNoteId(null);
    setDropTargetFolderId(null);
    setIsTouchDragging(false);
    touchStartPosRef.current = null;
  }, [clearLongPressTimer]);

  // Get root folders (no parent)
  const rootFolders = folders.filter((f) => f.parentId === null);

  // Get notes without folder
  const rootNotes = notes.filter((n) => n.folderId === null);

  // Get subfolders for a parent
  const getSubfolders = (parentId: FolderId) =>
    folders.filter((f) => f.parentId === parentId);

  // Get notes in a folder
  const getNotesInFolder = (folderId: FolderId) =>
    notes.filter((n) => n.folderId === folderId);

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
      <div key={folder.id}>
        <div
          ref={registerFolderRef}
          className={cn(
            "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent active:bg-accent [touch-action:manipulation]",
            selectedFolderId === folder.id && "bg-accent",
            isDropTarget && draggedNoteId && "bg-primary/20 ring-2 ring-primary ring-inset"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onTouchEnd={(e) => {
            if (!isTouchDragging) {
              e.preventDefault();
              handleSelect();
            }
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
      setSelectedNoteId(note.id);
      setSelectedFolderId(note.folderId);
      closeSidebarOnMobile();
    };

    const isDragging = draggedNoteId === note.id;

    return (
      <div
        key={note.id}
        className={cn(
          "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent active:bg-accent",
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
          if (isTouchDragging) {
            handleTouchEnd();
          } else {
            clearLongPressTimer();
            e.preventDefault();
            handleSelect();
          }
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
      <aside className="flex h-full w-full shrink-0 flex-col border-r border-border bg-background">
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
                  onClick={handleCreateFolder}
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>
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
          </div>
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
          <div
            ref={sidebarContainerRef}
            className={cn(
              "p-2 min-h-full sidebar-container",
              dropTargetFolderId === "root" && draggedNoteId && "bg-primary/10"
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
          <span>Drag to a folder or release to move</span>
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
