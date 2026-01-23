"use client";

/**
 * JazzEditorPanel - Jazz-powered editor panel component
 * 
 * This is a minimal implementation that will be expanded to match the
 * full functionality of the original Evolu-based EditorPanel.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Edit3, Eye, Pin, PinOff, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { useNotesQuery, useMutations } from "@/lib/jazz/dataBridge";

export function JazzEditorPanel() {
  const notes = useNotesQuery();
  const { update } = useMutations();
  const { selectedNoteId, sidebarCollapsed, setSidebarOpen } = useNoteStore();

  // Close sidebar on mobile when clicking on editor panel
  const handlePanelClick = useCallback(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Find the selected note
  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  // Get current note's mode from database (default to "edit" for new notes)
  const currentMode = selectedNote?.viewMode ?? "edit";

  // Sync local state with selected note
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content ?? "");
    } else {
      setTitle("");
      setContent("");
    }
  }, [selectedNote]);

  // Toggle between edit and preview mode
  const toggleMode = useCallback(() => {
    if (!selectedNoteId) return;

    // Save content when switching from edit to preview
    if (currentMode === "edit") {
      saveNote();
    }

    const newMode = currentMode === "edit" ? "preview" : "edit";
    update("notes", { id: selectedNoteId, viewMode: newMode });
  }, [selectedNoteId, currentMode, update]);

  // Save note
  const saveNote = useCallback(() => {
    if (!selectedNoteId) return;
    
    update("notes", {
      id: selectedNoteId,
      title: title.trim() || "Untitled",
      content,
    });
  }, [selectedNoteId, title, content, update]);

  // Toggle pin
  const togglePin = useCallback(() => {
    if (!selectedNote) return;
    update("notes", { id: selectedNote.id, isPinned: !selectedNote.isPinned });
  }, [selectedNote, update]);

  // Auto-save on blur
  const handleBlur = useCallback(() => {
    if (selectedNoteId && (title !== selectedNote?.title || content !== selectedNote?.content)) {
      saveNote();
    }
  }, [selectedNoteId, title, content, selectedNote, saveNote]);

  if (!selectedNote) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center bg-background p-8",
          sidebarCollapsed ? "md:pl-12" : ""
        )}
        onClick={handlePanelClick}
      >
        <p className="text-muted-foreground">Select a note to view or edit</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-1 flex-col bg-background",
          sidebarCollapsed ? "md:pl-12" : ""
        )}
        onClick={handlePanelClick}
      >
        {/* Editor toolbar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            placeholder="Note title..."
            className="h-8 max-w-md border-0 bg-transparent text-lg font-medium focus-visible:ring-0"
          />
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={togglePin}
                >
                  {selectedNote.isPinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedNote.isPinned ? "Unpin" : "Pin"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleMode}
                >
                  {currentMode === "edit" ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {currentMode === "edit" ? "Preview" : "Edit"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Editor content */}
        <div className="flex-1 overflow-hidden">
          {currentMode === "edit" ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              placeholder="Start writing..."
              className="h-full min-h-full w-full resize-none rounded-none border-0 p-4 text-base focus-visible:ring-0"
            />
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <article className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || "*No content*"}
                </ReactMarkdown>
              </article>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
