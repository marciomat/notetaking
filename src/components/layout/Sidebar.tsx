"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  Trash2,
  PanelLeftClose,
} from "lucide-react";
import { useQuery } from "@evolu/react";
import * as Evolu from "@evolu/common";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const handleCreateNote = () => {
    const result = insert("note", {
      title: Evolu.NonEmptyString100.orThrow("Untitled Note"),
      content: null,
      folderId: selectedFolderId,
    });
    if (result.ok) {
      setSelectedNoteId(result.value.id);
      closeSidebarOnMobile();
    }
  };

  const handleCreateFolder = () => {
    insert("folder", {
      name: Evolu.NonEmptyString100.orThrow("New Folder"),
      parentId: selectedFolderId,
    });
  };

  const handleDeleteNote = (id: NoteId, e: React.MouseEvent) => {
    e.stopPropagation();
    update("note", { id, isDeleted: Evolu.sqliteTrue });
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  };

  const handleDeleteFolder = (id: FolderId, e: React.MouseEvent) => {
    e.stopPropagation();
    update("folder", { id, isDeleted: Evolu.sqliteTrue });
    if (selectedFolderId === id) {
      setSelectedFolderId(null);
    }
  };

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

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
            selectedFolderId === folder.id && "bg-accent"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            setSelectedFolderId(folder.id);
            setSelectedNoteId(null);
            if (hasChildren) {
              toggleFolder(folder.id);
            }
          }}
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
          <span className="flex-1 truncate">{folder.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => handleDeleteFolder(folder.id, e)}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>

        {isExpanded && (
          <>
            {subfolders.map((subfolder) => renderFolder(subfolder, depth + 1))}
            {folderNotes.map((note) => renderNote(note, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const renderNote = (note: (typeof notes)[number], depth = 0) => (
    <div
      key={note.id}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
        selectedNoteId === note.id && "bg-accent"
      )}
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
      onClick={() => {
        setSelectedNoteId(note.id);
        setSelectedFolderId(note.folderId);
        closeSidebarOnMobile();
      }}
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{note.title}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={(e) => handleDeleteNote(note.id, e)}
      >
        <Trash2 className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );

  return (
    <TooltipProvider>
      <aside className="flex h-full w-full shrink-0 flex-col border-r border-border bg-background">
        {/* Sidebar header */}
        <div className="flex h-10 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hidden md:flex"
                  onClick={toggleSidebarCollapsed}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse Sidebar</TooltipContent>
            </Tooltip>
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Notes
            </span>
          </div>
          <div className="flex items-center gap-1">
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
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Note</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator />

        {/* Notes and folders list */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Root folders */}
            {rootFolders.map((folder) => renderFolder(folder))}

            {/* Root notes (without folder) */}
            {rootNotes.map((note) => renderNote(note))}

            {/* Empty state */}
            {rootFolders.length === 0 && rootNotes.length === 0 && (
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
    </TooltipProvider>
  );
}
