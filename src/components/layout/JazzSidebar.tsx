"use client";

/**
 * JazzSidebar - Jazz-powered sidebar component
 * 
 * This is a minimal implementation that will be expanded to match the
 * full functionality of the original Evolu-based Sidebar.
 * 
 * TODO: Port the full Sidebar component functionality
 */

import { useState, useCallback, useMemo } from "react";
import {
  FolderPlus,
  FileText,
  Trash2,
  PanelLeftClose,
  Pencil,
  Pin,
  Calculator,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { useNotesQuery, useFoldersQuery, useMutations } from "@/lib/jazz/dataBridge";

export function JazzSidebar() {
  const notes = useNotesQuery();
  const folders = useFoldersQuery();
  const { insert, update } = useMutations();
  
  const {
    selectedNoteId,
    setSelectedNoteId,
    setSidebarOpen,
    toggleSidebarCollapsed,
  } = useNoteStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");

  // Sort notes: pinned first, then by sortOrder
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [notes]);

  const handleCreateNote = useCallback(() => {
    if (!newNoteName.trim()) return;
    
    insert("notes", {
      title: newNoteName.trim(),
      content: null,
      noteType: "text",
      isPinned: false,
      folderId: null,
      tags: null,
      calculatorState: null,
      viewMode: "edit",
      sortOrder: Date.now(),
    });
    
    setNewNoteName("");
    setIsCreating(false);
  }, [newNoteName, insert]);

  const handleSelectNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSelectedNoteId, setSidebarOpen]);

  const handleTogglePin = useCallback((noteId: string, currentlyPinned: boolean) => {
    update("notes", { id: noteId, isPinned: !currentlyPinned });
  }, [update]);

  const handleDeleteNote = useCallback((noteId: string) => {
    // Soft delete by removing from list (in a real implementation, we'd mark as deleted)
    // For now we don't have delete in the data bridge
    console.log("Delete note:", noteId);
  }, []);

  return (
    <div className="flex h-full flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-medium">Notes</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hidden md:flex"
            onClick={toggleSidebarCollapsed}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New note input */}
      {isCreating && (
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            placeholder="Note name..."
            value={newNoteName}
            onChange={(e) => setNewNoteName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateNote();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewNoteName("");
              }
            }}
            onBlur={() => {
              if (newNoteName.trim()) {
                handleCreateNote();
              } else {
                setIsCreating(false);
              }
            }}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Notes list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer",
                "hover:bg-accent hover:text-accent-foreground",
                selectedNoteId === note.id && "bg-accent text-accent-foreground"
              )}
              onClick={() => handleSelectNote(note.id)}
            >
              {note.noteType === "calculator" ? (
                <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{note.title}</span>
              {note.isPinned && (
                <Pin className="h-3 w-3 shrink-0 text-primary" />
              )}
              <div className="hidden group-hover:flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePin(note.id, note.isPinned);
                  }}
                >
                  <Pin className={cn("h-3 w-3", note.isPinned && "text-primary")} />
                </Button>
              </div>
            </div>
          ))}
          
          {sortedNotes.length === 0 && !isCreating && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>No notes yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsCreating(true)}
              >
                Create your first note
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
