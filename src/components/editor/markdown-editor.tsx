"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import { useEffect } from "react";

const lowlight = createLowlight(all);

/**
 * Markdown Editor with Obsidian-like real-time rendering
 * 
 * Markdown Shortcuts:
 * - **bold** or __bold__ → Bold text
 * - *italic* or _italic_ → Italic text
 * - `code` → Inline code
 * - # Heading 1, ## Heading 2, ### Heading 3
 * - - List item or * List item → Bullet list
 * - 1. Item → Numbered list
 * - [ ] Task → Task list
 * - > Quote → Blockquote
 * - ``` code ``` → Code block
 * - --- → Horizontal rule
 * - Smart quotes, em dashes (--), ellipses (...)
 */

interface MarkdownEditorProps {
  content: Record<string, unknown> | null;
  onUpdate: (json: Record<string, unknown>) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
}

export function MarkdownEditor({
  content,
  onUpdate,
  placeholder = "Start writing...",
  onEditorReady,
}: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: false, // Disable default code block to use lowlight version
        code: {
          HTMLAttributes: {
            class: "bg-muted px-1.5 py-0.5 rounded text-sm font-mono",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-primary/50 pl-4 italic text-muted-foreground",
          },
        },
        horizontalRule: {
          HTMLAttributes: {
            class: "my-6 border-muted-foreground/20",
          },
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto",
        },
        exitOnTripleEnter: true,
        exitOnArrowDown: true,
      }),
      Typography.configure({
        // Smart quotes, em dashes, ellipses
      }),
      Placeholder.configure({ 
        placeholder,
        showOnlyWhenEditable: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { 
          class: "text-primary underline underline-offset-2 decoration-primary/50 hover:decoration-primary transition-colors cursor-pointer",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0",
        },
      }),
      TaskItem.configure({ 
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2 my-1",
        },
      }),
    ],
    content,
    immediatelyRender: false, // Required for Next.js SSR
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor max-w-none focus:outline-none min-h-[200px] p-4 sm:p-6",
      },
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync external content changes (for CRDT updates)
  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
}
