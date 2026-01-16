"use client";

import { useState, useEffect, useCallback } from "react";
import { Edit3, Eye } from "lucide-react";
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
import { useEvolu, notesQuery } from "@/lib/evolu";
import { useNoteStore } from "@/lib/hooks/useNoteStore";
import { useQuery } from "@evolu/react";

export function EditorPanel() {
  const { update } = useEvolu();
  const notes = useQuery(notesQuery);
  const { selectedNoteId } = useNoteStore();

  const [isEditing, setIsEditing] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Find the selected note
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

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

  if (!selectedNote) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background">
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
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Editor header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveNote}
            className="h-8 max-w-md border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            placeholder="Note title..."
          />

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isEditing ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={!isEditing ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(false)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Editor/Preview area */}
        <div className="flex-1 overflow-auto">
          {isEditing ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={saveNote}
              className={cn(
                "h-full min-h-full w-full resize-none rounded-none border-none p-4 font-mono text-sm shadow-none focus-visible:ring-0"
              )}
              placeholder="Start writing in Markdown..."
            />
          ) : (
            <div className="prose prose-neutral dark:prose-invert max-w-none p-4">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">
                  Nothing to preview yet...
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}
