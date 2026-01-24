"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Tag, X } from "lucide-react";
import { MarkdownEditor } from "./markdown-editor";
import { CalculatorEditor } from "./calculator-editor";
import { EditorToolbar } from "./editor-toolbar";
import { Editor } from "@tiptap/react";
import type { PlainNote, CalculatorNote } from "@/lib/schema";

type Note = PlainNote | CalculatorNote;

interface NoteEditorProps {
  note: Note;
  onUpdateTitle: (title: string) => void;
  onUpdateContent: (content: Record<string, unknown>) => void;
  onTogglePin: () => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (index: number) => void;
}

export function NoteEditor({
  note,
  onUpdateTitle,
  onUpdateContent,
  onTogglePin,
  onAddTag,
  onRemoveTag,
}: NoteEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const isCalculator = note.flavour === "calculator";

  const handleAddTag = () => {
    if (newTag.trim() && onAddTag) {
      onAddTag(newTag.trim());
      setNewTag("");
      setShowTagInput(false);
    }
  };

  // Get tags as array
  const tags: string[] = [];
  if (note.tags) {
    for (let i = 0; i < note.tags.length; i++) {
      const tag = note.tags[i];
      if (tag) tags.push(tag);
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none space-y-0 pb-2">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <Input
            value={note.title || ""}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="Untitled"
            className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0"
          />

          <Badge variant="secondary" className="flex-none">
            {isCalculator ? "Calculator" : "Note"}
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePin}
            className="flex-none h-8 w-8"
          >
            {note.isPinned ? (
              <Pin className="h-4 w-4 fill-current" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          <Tag className="h-3 w-3 text-muted-foreground" />
          {tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs gap-1">
              {tag}
              {onRemoveTag && (
                <button
                  onClick={() => onRemoveTag(i)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {showTagInput ? (
            <div className="flex items-center gap-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTag();
                  if (e.key === "Escape") {
                    setNewTag("");
                    setShowTagInput(false);
                  }
                }}
                placeholder="Tag name"
                className="h-6 w-24 text-xs"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleAddTag}
              >
                Add
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowTagInput(true)}
            >
              + Add tag
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Toolbar for markdown only */}
      {!isCalculator && <EditorToolbar editor={editor} />}

      <CardContent className="flex-1 overflow-auto p-0">
        {isCalculator ? (
          <CalculatorEditor
            lines={(() => {
              const calcNote = note as CalculatorNote;
              const linesList = calcNote.content?.lines;
              if (!linesList || linesList.length === 0) return [""];
              // Convert CoList to array
              const arr: string[] = [];
              for (let i = 0; i < linesList.length; i++) {
                arr.push(linesList[i] ?? "");
              }
              return arr.length > 0 ? arr : [""];
            })()}
            onUpdate={(lines) => onUpdateContent({ lines })}
          />
        ) : (
          <MarkdownEditor
            content={(() => {
              const plainNote = note as PlainNote;
              const rawContent = plainNote.content?.rawContent;
              if (!rawContent) return { type: "doc", content: [] };
              try {
                return { type: "doc", content: JSON.parse(rawContent) };
              } catch {
                return { type: "doc", content: [] };
              }
            })()}
            onUpdate={onUpdateContent}
            onEditorReady={setEditor}
          />
        )}
      </CardContent>
    </Card>
  );
}
