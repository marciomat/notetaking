"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Edit3, Eye, Pin, PinOff, Calculator } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as Evolu from "@evolu/common";
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
import { createNotesQuery } from "@/lib/evolu";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { useQuery } from "@evolu/react";
import { CalculatorEditor } from "./CalculatorEditor";
import { TagInput } from "./TagInput";
import { useCurrentEvolu, useTabEvoluHook } from "@/components/app/TabContent";

// Helper to parse tags from JSON string
function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function EditorPanel() {
  const evoluInstance = useCurrentEvolu();
  const { update } = useTabEvoluHook();
  
  // Create queries using the current tab's evolu instance
  const notesQuery = useMemo(() => createNotesQuery(evoluInstance), [evoluInstance]);
  const notes = useQuery(notesQuery);
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
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  // Collect all unique tags from all notes for autocomplete
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
      const tagsValue = typeof note.tags === 'string' ? note.tags : null;
      parseTags(tagsValue).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Get current note's tags
  const currentTags = useMemo(() => {
    const tagsValue = typeof selectedNote?.tags === 'string' ? selectedNote.tags : null;
    return parseTags(tagsValue);
  }, [selectedNote?.tags]);

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

  // Toggle between edit and preview mode for current note
  const toggleMode = () => {
    if (!selectedNoteId) return;

    // Save content when switching from edit to preview
    if (currentMode === "edit") {
      saveNote();
    }

    // Update the view mode in the database
    const newMode = currentMode === "edit" ? "preview" : "edit";
    const parsedMode = Evolu.NonEmptyString100.from(newMode);
    if (parsedMode.ok) {
      update("note", {
        id: selectedNoteId,
        viewMode: parsedMode.value,
      });
    }
  };

  // Toggle pin status for current note
  const togglePin = () => {
    if (!selectedNoteId || !selectedNote) return;

    const isPinned = selectedNote.isPinned === Evolu.sqliteTrue;
    update("note", {
      id: selectedNoteId,
      // Use null when unpinning so it sorts the same as never-pinned items
      isPinned: isPinned ? null : Evolu.sqliteTrue,
    });
  };

  // Handle tags change
  const handleTagsChange = useCallback((newTags: string[]) => {
    if (!selectedNoteId) return;
    const tagsJson = newTags.length > 0 ? JSON.stringify(newTags) : null;
    update("note", {
      id: selectedNoteId,
      tags: tagsJson,
    });
  }, [selectedNoteId, update]);

  // Debounced save function
  const saveNote = useCallback(() => {
    if (!selectedNoteId || !selectedNote) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    // Only update if values changed
    const titleChanged = trimmedTitle !== selectedNote.title;
    const contentChanged = (content || null) !== selectedNote.content;

    if (titleChanged || contentChanged) {
      // Try to create a valid title
      const parsedTitle = Evolu.NonEmptyString100.from(trimmedTitle);

      if (titleChanged && contentChanged && parsedTitle.ok) {
        update("note", {
          id: selectedNoteId,
          title: parsedTitle.value,
          content: content || null,
        });
      } else if (titleChanged && parsedTitle.ok) {
        update("note", {
          id: selectedNoteId,
          title: parsedTitle.value,
        });
      } else if (contentChanged) {
        update("note", {
          id: selectedNoteId,
          content: content || null,
        });
      }
    }
  }, [selectedNoteId, selectedNote, title, content, update]);

  // Auto-save on blur or after typing stops
  useEffect(() => {
    const timer = setTimeout(saveNote, 500);
    return () => clearTimeout(timer);
  }, [title, content, saveNote]);

  // Check if current note is a calculator note
  const isCalculatorNote = selectedNote?.noteType === "calculator";

  if (!selectedNote) {
    return (
      <main
        className="flex flex-1 items-center justify-center bg-background"
        onClick={handlePanelClick}
      >
        <div className="text-center">
          <Edit3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">
            Select a note or create a new one
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your notes support Markdown formatting
          </p>
        </div>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <main
        className="flex flex-1 flex-col overflow-hidden bg-background"
        onClick={handlePanelClick}
      >
        {/* Editor header */}
        <div
          className={cn(
            "shrink-0 border-b border-border px-4 py-2",
            sidebarCollapsed && "md:pl-14"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveNote}
                className="h-8 max-w-md border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                placeholder="Note title..."
              />
            </div>

            <div className="flex items-center gap-1">
            {/* Calculator indicator for calculator notes */}
            {isCalculatorNote && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 items-center justify-center">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Calculator Note</TooltipContent>
              </Tooltip>
            )}

            {/* Pin button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedNote?.isPinned === Evolu.sqliteTrue ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={togglePin}
                >
                  {selectedNote?.isPinned === Evolu.sqliteTrue ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedNote?.isPinned === Evolu.sqliteTrue ? "Unpin" : "Pin"}
              </TooltipContent>
            </Tooltip>

            {/* Edit/Preview toggle button - only for regular notes */}
            {!isCalculatorNote && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentMode === "edit" ? "secondary" : "ghost"}
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
            )}
            </div>
          </div>

          {/* Tags section */}
          <div className="mt-1.5">
            <TagInput
              tags={currentTags}
              onChange={handleTagsChange}
              allTags={allTags}
            />
          </div>
        </div>

        {/* Editor/Preview area */}
        <div
          className={cn(
            "flex-1 overflow-hidden",
            sidebarCollapsed && "md:pl-10"
          )}
        >
          {isCalculatorNote ? (
            <CalculatorEditor
              content={content}
              onChange={setContent}
              onBlur={saveNote}
              autoFocus
            />
          ) : currentMode === "edit" ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={saveNote}
              autoFocus
              className={cn(
                "h-full min-h-full w-full resize-none rounded-none border-none p-4 font-mono text-sm shadow-none focus-visible:ring-0"
              )}
              placeholder="Start writing in Markdown..."
            />
          ) : (
            <div className="prose prose-neutral dark:prose-invert max-w-none p-4 overflow-auto h-full">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">
                  No content yet. Click the edit button to start writing.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}
