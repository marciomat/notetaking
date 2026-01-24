# Implementation TODO - PWA Notetaking App

> **Goal**: Build a local-first, E2E encrypted notetaking PWA with full iOS support.
> 
> **Stack**: Next.js + Serwist (PWA) + ShadCN UI + Jazz.tools (CRDT/E2EE) + TipTap (Markdown) + React Arborist (Tree) + mathjs-style calculator

---

## Phase 1: Project Setup

### 1.1 Initialize Next.js Project
- [ ] Create Next.js app with TypeScript and Tailwind
  ```bash
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
  ```
- [ ] Verify project runs with `pnpm dev`

### 1.2 Initialize ShadCN UI (Dark Mode Default)
- [ ] Run ShadCN init
  ```bash
  pnpm dlx shadcn@latest init
  ```
- [ ] Select options:
  - Style: Default
  - Base color: Slate (or Zinc for darker feel)
  - CSS variables: Yes
  - **Theme: Dark** (set as default in `tailwind.config.ts` and `globals.css`)
  
- [ ] Configure `globals.css` to default to dark mode:
  ```css
  :root {
    /* dark mode colors as default */
  }
  ```
  Or use `class="dark"` on `<html>` in layout.tsx

- [ ] Install required ShadCN components:
  ```bash
  pnpm dlx shadcn@latest add button
  pnpm dlx shadcn@latest add dialog
  pnpm dlx shadcn@latest add input
  pnpm dlx shadcn@latest add dropdown-menu
  pnpm dlx shadcn@latest add scroll-area
  pnpm dlx shadcn@latest add card
  pnpm dlx shadcn@latest add separator
  pnpm dlx shadcn@latest add textarea
  pnpm dlx shadcn@latest add sheet
  pnpm dlx shadcn@latest add toast
  pnpm dlx shadcn@latest add badge
  pnpm dlx shadcn@latest add tooltip
  pnpm dlx shadcn@latest add tabs
  pnpm dlx shadcn@latest add select
  ```

---

## Phase 2: PWA Configuration with Serwist

### 2.1 Install Serwist
- [ ] Install packages:
  ```bash
  pnpm add @serwist/next
  pnpm add -D serwist
  ```

### 2.2 Configure next.config.mjs
- [ ] Create/update `next.config.mjs`:
  ```javascript
  import withSerwistInit from "@serwist/next";

  const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    additionalPrecacheEntries: [{ url: "/~offline", revision: Date.now().toString() }],
  });

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    // your config here
  };

  export default withSerwist(nextConfig);
  ```

### 2.3 Create Service Worker
- [ ] Create `src/app/sw.ts`:
  ```typescript
  import { defaultCache } from "@serwist/next/worker";
  import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
  import { Serwist } from "serwist";

  declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
      __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
  }

  declare const self: ServiceWorkerGlobalScope;

  const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
    fallbacks: {
      entries: [
        {
          url: "/~offline",
          matcher({ request }) {
            return request.destination === "document";
          },
        },
      ],
    },
  });

  serwist.addEventListeners();
  ```

### 2.4 Update TypeScript Config
- [ ] Update `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "lib": ["dom", "dom.iterable", "esnext", "webworker"],
      "types": ["@serwist/next/typings"]
    },
    "exclude": ["public/sw.js"]
  }
  ```

### 2.5 Update .gitignore
- [ ] Add to `.gitignore`:
  ```
  # Serwist
  public/sw*
  public/swe-worker*
  ```

### 2.6 Create Offline Fallback Page
- [ ] Create `src/app/~offline/page.tsx`:
  ```typescript
  export default function OfflinePage() {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">You're offline</h1>
          <p className="text-muted-foreground mt-2">
            Please check your internet connection.
          </p>
        </div>
      </div>
    );
  }
  ```

### 2.7 Create Web App Manifest
- [ ] Create `src/app/manifest.ts`:
  ```typescript
  import type { MetadataRoute } from "next";

  export default function manifest(): MetadataRoute.Manifest {
    return {
      name: "Notes",
      short_name: "Notes",
      description: "E2E encrypted notetaking with real-time sync",
      start_url: "/",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: "#0a0a0a",
      icons: [
        {
          src: "/icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    };
  }
  ```

- [ ] Create placeholder icons in `public/icons/`:
  - `icon-192x192.png`
  - `icon-512x512.png`
  - `apple-touch-icon-180x180.png`
  - `apple-touch-icon-152x152.png`
  - `apple-touch-icon-120x120.png`

### 2.8 Add iOS PWA Meta Tags
- [ ] Update `src/app/layout.tsx` with iOS meta tags:
  ```typescript
  export const metadata: Metadata = {
    title: "Notes",
    description: "E2E encrypted notetaking",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Notes",
    },
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      viewportFit: "cover",
    },
  };
  ```

- [ ] Add apple-touch-icon links in `<head>`:
  ```typescript
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
  <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
  ```

### 2.9 Create iOS Install Prompt Component
- [ ] Create `src/components/ios-install-prompt.tsx`:
  ```typescript
  "use client";
  
  import { useState, useEffect } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { X } from "lucide-react";

  export function IOSInstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const dismissed = localStorage.getItem("ios-install-dismissed");
      
      if (isIOS && !isStandalone && !dismissed) {
        setShowPrompt(true);
      }
    }, []);

    if (!showPrompt) return null;

    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50">
        <CardContent className="p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => {
              localStorage.setItem("ios-install-dismissed", "true");
              setShowPrompt(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <p className="pr-8">
            Install this app: tap <strong>Share</strong> ⎋ then{" "}
            <strong>Add to Home Screen</strong> ➕
          </p>
        </CardContent>
      </Card>
    );
  }
  ```

---

## Phase 3: Jazz.tools Integration

### 3.1 Install Jazz.tools
- [ ] Install package:
  ```bash
  pnpm add jazz-tools jazz-react
  ```

### 3.2 Define Data Schema
- [ ] Create `src/lib/schema.ts`:
  ```typescript
  import { co, CoMap, CoList, Account, Profile, Group } from "jazz-tools";

  // ============================================
  // NOTE CONTENT TYPES
  // ============================================

  // TipTap JSON document structure for markdown notes
  export class MarkdownContent extends CoMap {
    type = co.literal("doc");
    content = co.json<any[]>(); // TipTap JSON content array
  }

  // Simple text content for calculator notes
  export class CalculatorContent extends CoMap {
    lines = co.json<string[]>(); // Array of line strings
  }

  // ============================================
  // NOTE TYPES (Flavours)
  // ============================================

  export class PlainNote extends CoMap {
    flavour = co.literal("plain");
    title = co.string;
    content = co.ref(MarkdownContent);
    tags = co.list(co.string);
    isPinned = co.boolean;
    createdAt = co.Date;
    updatedAt = co.Date;
  }

  export class CalculatorNote extends CoMap {
    flavour = co.literal("calculator");
    title = co.string;
    content = co.ref(CalculatorContent);
    tags = co.list(co.string);
    isPinned = co.boolean;
    createdAt = co.Date;
    updatedAt = co.Date;
  }

  // Union type for notes
  export type Note = PlainNote | CalculatorNote;

  // ============================================
  // FOLDER STRUCTURE
  // ============================================

  export class FolderItem extends CoMap {
    itemType = co.literal("note", "folder");
    noteRef = co.optional.ref(() => PlainNote); // or CalculatorNote
    folderRef = co.optional.ref(() => Folder);
    order = co.number; // For manual ordering
  }

  export class FolderItemList extends CoList.Of(co.ref(FolderItem)) {}

  export class Folder extends CoMap {
    name = co.string;
    depth = co.number; // 0 = root level, max 3
    isExpanded = co.boolean;
    children = co.ref(FolderItemList);
    createdAt = co.Date;
  }

  // ============================================
  // WORKSPACE (Root)
  // ============================================

  export class Workspace extends CoMap {
    name = co.string;
    rootChildren = co.ref(FolderItemList); // Top-level items
  }

  // ============================================
  // ACCOUNT
  // ============================================

  export class NotesAccountRoot extends CoMap {
    workspace = co.ref(Workspace);
  }

  export class NotesAccount extends Account {
    root = co.ref(NotesAccountRoot);
    profile = co.ref(Profile);

    async migrate(creationProps?: { name: string }) {
      if (!this._refs.root) {
        const group = Group.create({ owner: this });
        
        const workspace = Workspace.create(
          {
            name: "My Notes",
            rootChildren: FolderItemList.create([], { owner: group }),
          },
          { owner: group }
        );

        this.root = NotesAccountRoot.create(
          { workspace },
          { owner: group }
        );
      }

      if (!this._refs.profile && creationProps) {
        this.profile = Profile.create(
          { name: creationProps.name },
          { owner: this }
        );
      }
    }
  }
  ```

### 3.3 Create Jazz Provider
- [ ] Create `src/components/providers/jazz-provider.tsx`:
  ```typescript
  "use client";

  import { JazzProvider as BaseJazzProvider } from "jazz-react";
  import { NotesAccount } from "@/lib/schema";

  const JAZZ_PEER = process.env.NEXT_PUBLIC_JAZZ_PEER || "wss://cloud.jazz.tools/?key=you@example.com";

  export function JazzProvider({ children }: { children: React.ReactNode }) {
    return (
      <BaseJazzProvider
        AccountSchema={NotesAccount}
        peer={JAZZ_PEER}
      >
        {children}
      </BaseJazzProvider>
    );
  }
  ```

### 3.4 Create BIP-39 Wordlist
- [ ] Create `src/lib/wordlist.ts`:
  - Copy BIP-39 English wordlist (2048 words)
  - Export as `export const wordlist: string[] = [...]`

### 3.5 Create Auth Components
- [ ] Create `src/components/auth/auth-modal.tsx`:
  ```typescript
  "use client";

  import { useState } from "react";
  import { usePassphraseAuth } from "jazz-react";
  import { wordlist } from "@/lib/wordlist";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Textarea } from "@/components/ui/textarea";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

  interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  export function AuthModal({ open, onOpenChange }: AuthModalProps) {
    const [loginPhrase, setLoginPhrase] = useState("");
    const auth = usePassphraseAuth({ wordlist });

    const handleCreate = async () => {
      await auth.signUp();
      onOpenChange(false);
    };

    const handleLogin = async () => {
      try {
        await auth.logIn(loginPhrase);
        onOpenChange(false);
      } catch (error) {
        console.error("Login failed:", error);
        // Show toast error
      }
    };

    if (auth.state === "signedIn") return null;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Notes</DialogTitle>
            <DialogDescription>
              Create a new vault or restore an existing one.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="new">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">New Vault</TabsTrigger>
              <TabsTrigger value="restore">Restore</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Your 12-word recovery phrase
                </label>
                <Textarea
                  readOnly
                  value={auth.passphrase}
                  className="mt-1 font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Save this phrase securely. It's the only way to access
                  your notes on other devices.
                </p>
              </div>
              <Button onClick={handleCreate} className="w-full">
                I've saved my phrase – Create Vault
              </Button>
            </TabsContent>

            <TabsContent value="restore" className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Enter your recovery phrase
                </label>
                <Textarea
                  value={loginPhrase}
                  onChange={(e) => setLoginPhrase(e.target.value)}
                  placeholder="word1 word2 word3 ..."
                  className="mt-1 font-mono text-sm"
                  rows={3}
                />
              </div>
              <Button onClick={handleLogin} className="w-full">
                Restore Vault
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }
  ```

### 3.6 Create Auth Hook Wrapper
- [ ] Create `src/hooks/use-notes-account.ts`:
  ```typescript
  import { useAccount } from "jazz-react";
  import { NotesAccount } from "@/lib/schema";

  export function useNotesAccount() {
    return useAccount<NotesAccount>();
  }
  ```

---

## Phase 4: React Arborist with iOS Touch Support

### 4.1 Install Dependencies
- [ ] Install packages:
  ```bash
  pnpm add react-arborist react-dnd react-dnd-html5-backend react-dnd-touch-backend react-dnd-multi-backend rdndmb-html5-to-touch use-resize-observer
  ```

### 4.2 Create DnD Provider Wrapper
- [ ] Create `src/components/providers/dnd-provider.tsx`:
  ```typescript
  "use client";

  import { DndProvider } from "react-dnd-multi-backend";
  import { HTML5toTouch } from "rdndmb-html5-to-touch";

  export function DnDWrapper({ children }: { children: React.ReactNode }) {
    return (
      <DndProvider options={HTML5toTouch}>
        {children}
      </DndProvider>
    );
  }
  ```

### 4.3 Create Touch Drag Preview
- [ ] Create `src/components/tree/drag-preview.tsx`:
  ```typescript
  "use client";

  import { usePreview } from "react-dnd-multi-backend";
  import { Card } from "@/components/ui/card";
  import { File, Folder } from "lucide-react";

  export function DragPreview() {
    const preview = usePreview();

    if (!preview.display) return null;

    const { item, style } = preview;

    return (
      <div style={{ ...style, zIndex: 9999 }}>
        <Card className="px-3 py-2 flex items-center gap-2 bg-accent shadow-lg">
          {item.isFolder ? (
            <Folder className="h-4 w-4" />
          ) : (
            <File className="h-4 w-4" />
          )}
          <span className="text-sm truncate max-w-[150px]">{item.name}</span>
        </Card>
      </div>
    );
  }
  ```

### 4.4 Create Note Tree Component
- [ ] Create `src/components/tree/note-tree.tsx`:
  ```typescript
  "use client";

  import { Tree, NodeRendererProps, NodeApi } from "react-arborist";
  import { useDragDropManager } from "react-dnd";
  import useResizeObserver from "use-resize-observer";
  import { cn } from "@/lib/utils";
  import { Folder, File, ChevronRight, ChevronDown, Pin } from "lucide-react";

  // Types
  export interface TreeNode {
    id: string;
    name: string;
    isFolder: boolean;
    isPinned?: boolean;
    flavour?: "plain" | "calculator";
    children?: TreeNode[];
  }

  interface NoteTreeProps {
    data: TreeNode[];
    onSelect: (node: TreeNode | null) => void;
    onCreate: (args: { parentId: string | null; index: number; type: "leaf" | "internal" }) => TreeNode | null;
    onMove: (args: { dragIds: string[]; parentId: string | null; index: number }) => void;
    onRename: (args: { id: string; name: string }) => void;
    onDelete: (args: { ids: string[] }) => void;
  }

  function TreeNodeRenderer({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
    return (
      <div
        ref={dragHandle}
        style={style}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer select-none",
          "touch-action-none", // Critical for iOS touch DnD
          node.isSelected && "bg-accent",
          node.isFocused && "ring-1 ring-ring"
        )}
        onClick={() => node.select()}
        onDoubleClick={() => node.isInternal && node.toggle()}
      >
        {/* Folder expand/collapse icon */}
        {node.isInternal ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              node.toggle();
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {node.isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Icon */}
        {node.isInternal ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <File className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Name or edit input */}
        {node.isEditing ? (
          <input
            type="text"
            defaultValue={node.data.name}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => node.submit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") node.submit(e.currentTarget.value);
              if (e.key === "Escape") node.reset();
            }}
            autoFocus
            className="flex-1 bg-transparent outline-none border-none text-sm"
          />
        ) : (
          <span className="flex-1 truncate text-sm">{node.data.name}</span>
        )}

        {/* Pin indicator */}
        {node.data.isPinned && !node.isInternal && (
          <Pin className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    );
  }

  export function NoteTree({
    data,
    onSelect,
    onCreate,
    onMove,
    onRename,
    onDelete,
  }: NoteTreeProps) {
    const { ref, width, height } = useResizeObserver<HTMLDivElement>();
    const dndManager = useDragDropManager();

    // Validate folder depth on move
    const handleMove = (args: { dragIds: string[]; parentId: string | null; index: number }) => {
      // Check if moving a folder would exceed depth 3
      // Implementation will check target depth and block if folder would exceed limit
      onMove(args);
    };

    return (
      <div ref={ref} className="h-full w-full">
        <Tree
          data={data}
          width={width ?? 280}
          height={height ?? 600}
          indent={16}
          rowHeight={32}
          paddingBottom={32}
          dndManager={dndManager}
          onCreate={onCreate}
          onMove={handleMove}
          onRename={onRename}
          onDelete={onDelete}
          onSelect={(nodes) => {
            const selected = nodes[0]?.data ?? null;
            onSelect(selected);
          }}
        >
          {TreeNodeRenderer}
        </Tree>
      </div>
    );
  }
  ```

### 4.5 Add CSS for Touch Support
- [ ] Add to `globals.css`:
  ```css
  /* Prevent iOS scroll during drag */
  .touch-action-none {
    touch-action: none;
  }

  /* Improve touch targets on mobile */
  @media (pointer: coarse) {
    .tree-node {
      min-height: 44px; /* iOS minimum touch target */
    }
  }
  ```

---

## Phase 5: TipTap Markdown Editor

### 5.1 Install TipTap
- [ ] Install packages:
  ```bash
  pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit
  pnpm add @tiptap/extension-placeholder
  pnpm add @tiptap/extension-link
  pnpm add @tiptap/extension-task-list @tiptap/extension-task-item
  pnpm add @tiptap/extension-code-block-lowlight lowlight
  ```

### 5.2 Create Markdown Editor Component
- [ ] Create `src/components/editor/markdown-editor.tsx`:
  ```typescript
  "use client";

  import { useEditor, EditorContent } from "@tiptap/react";
  import StarterKit from "@tiptap/starter-kit";
  import Placeholder from "@tiptap/extension-placeholder";
  import Link from "@tiptap/extension-link";
  import TaskList from "@tiptap/extension-task-list";
  import TaskItem from "@tiptap/extension-task-item";
  import { useEffect } from "react";

  interface MarkdownEditorProps {
    content: any; // TipTap JSON
    onUpdate: (json: any) => void;
    placeholder?: string;
  }

  export function MarkdownEditor({
    content,
    onUpdate,
    placeholder = "Start writing...",
  }: MarkdownEditorProps) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({ placeholder }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline" },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
      ],
      content,
      immediatelyRender: false, // Required for Next.js SSR
      onUpdate: ({ editor }) => {
        onUpdate(editor.getJSON());
      },
      editorProps: {
        attributes: {
          class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
        },
      },
    });

    // Sync external content changes (for CRDT updates)
    useEffect(() => {
      if (editor && content) {
        const currentContent = JSON.stringify(editor.getJSON());
        const newContent = JSON.stringify(content);
        if (currentContent !== newContent) {
          editor.commands.setContent(content, false);
        }
      }
    }, [content, editor]);

    return <EditorContent editor={editor} />;
  }
  ```

### 5.3 Create Editor Toolbar
- [ ] Create `src/components/editor/editor-toolbar.tsx`:
  ```typescript
  "use client";

  import { Editor } from "@tiptap/react";
  import { Button } from "@/components/ui/button";
  import { Separator } from "@/components/ui/separator";
  import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    CheckSquare,
    Heading1,
    Heading2,
    Quote,
    Undo,
    Redo,
  } from "lucide-react";
  import { cn } from "@/lib/utils";

  interface EditorToolbarProps {
    editor: Editor | null;
  }

  export function EditorToolbar({ editor }: EditorToolbarProps) {
    if (!editor) return null;

    const ToolbarButton = ({
      onClick,
      isActive,
      children,
    }: {
      onClick: () => void;
      isActive?: boolean;
      children: React.ReactNode;
    }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn("h-8 w-8 p-0", isActive && "bg-accent")}
      >
        {children}
      </Button>
    );

    return (
      <div className="flex items-center gap-0.5 p-1 border-b">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
        >
          <CheckSquare className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
    );
  }
  ```

---

## Phase 6: Calculator Editor

### 6.1 Create Calculator Parser
- [ ] Create `src/lib/calculator.ts`:
  ```typescript
  interface LineResult {
    input: string;
    label: string | null;
    value: number | null;
    error: string | null;
  }

  /**
   * Parse a single line of calculator input
   * Supports:
   * - Bare numbers: "25" -> 25
   * - Labeled values: "food: 25" -> label="food", value=25
   * - Expressions: "25 + 10" -> value=35
   * - Labeled expressions: "total: 25 + 10" -> label="total", value=35
   * - Text only (no number): "Shopping list" -> ignored
   */
  export function parseLine(line: string): LineResult {
    const trimmed = line.trim();
    
    if (!trimmed) {
      return { input: line, label: null, value: null, error: null };
    }

    // Check for label: value pattern
    const labelMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
    
    let label: string | null = null;
    let expression: string;
    
    if (labelMatch) {
      label = labelMatch[1].trim();
      expression = labelMatch[2].trim();
    } else {
      expression = trimmed;
    }

    // If no expression after label, or expression has no numbers, return null value
    if (!expression || !/\d/.test(expression)) {
      return { input: line, label, value: null, error: null };
    }

    // Evaluate the expression (supports +, -, *, /)
    try {
      // Sanitize: only allow numbers, operators, spaces, parentheses, decimal points
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        return { input: line, label, value: null, error: null };
      }

      // Use Function for safe evaluation (no access to scope)
      const result = Function(`"use strict"; return (${expression})`)();
      
      if (typeof result !== "number" || !isFinite(result)) {
        return { input: line, label, value: null, error: "Invalid result" };
      }

      return { input: line, label, value: result, error: null };
    } catch {
      return { input: line, label, value: null, error: "Invalid expression" };
    }
  }

  /**
   * Calculate total from all lines
   */
  export function calculateTotal(lines: string[]): {
    results: LineResult[];
    total: number;
  } {
    const results = lines.map(parseLine);
    const total = results.reduce((sum, r) => sum + (r.value ?? 0), 0);
    return { results, total };
  }

  /**
   * Format number for display
   */
  export function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
  ```

### 6.2 Create Calculator Editor Component
- [ ] Create `src/components/editor/calculator-editor.tsx`:
  ```typescript
  "use client";

  import { useState, useEffect, useCallback, useRef } from "react";
  import { parseLine, calculateTotal, formatNumber } from "@/lib/calculator";
  import { cn } from "@/lib/utils";

  interface CalculatorEditorProps {
    lines: string[];
    onUpdate: (lines: string[]) => void;
  }

  export function CalculatorEditor({ lines, onUpdate }: CalculatorEditorProps) {
    const [localLines, setLocalLines] = useState<string[]>(lines);
    const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

    // Sync external changes
    useEffect(() => {
      if (JSON.stringify(lines) !== JSON.stringify(localLines)) {
        setLocalLines(lines);
      }
    }, [lines]);

    const { results, total } = calculateTotal(localLines);

    const handleLineChange = useCallback(
      (index: number, value: string) => {
        const newLines = [...localLines];
        newLines[index] = value;
        setLocalLines(newLines);
        onUpdate(newLines);
      },
      [localLines, onUpdate]
    );

    const handleKeyDown = useCallback(
      (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const newLines = [...localLines];
          newLines.splice(index + 1, 0, "");
          setLocalLines(newLines);
          onUpdate(newLines);
          // Focus new line
          setTimeout(() => {
            textareaRefs.current[index + 1]?.focus();
          }, 0);
        }

        if (e.key === "Backspace" && localLines[index] === "" && index > 0) {
          e.preventDefault();
          const newLines = localLines.filter((_, i) => i !== index);
          setLocalLines(newLines);
          onUpdate(newLines);
          // Focus previous line
          setTimeout(() => {
            textareaRefs.current[index - 1]?.focus();
          }, 0);
        }
      },
      [localLines, onUpdate]
    );

    // Ensure at least one line
    useEffect(() => {
      if (localLines.length === 0) {
        setLocalLines([""]);
        onUpdate([""]);
      }
    }, [localLines, onUpdate]);

    return (
      <div className="p-4 min-h-[200px]">
        <div className="space-y-1">
          {results.map((result, index) => (
            <div key={index} className="flex items-center gap-4">
              {/* Input */}
              <textarea
                ref={(el) => (textareaRefs.current[index] = el)}
                value={localLines[index]}
                onChange={(e) => handleLineChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                placeholder={index === 0 ? "food: 25" : ""}
                rows={1}
                className={cn(
                  "flex-1 bg-transparent resize-none outline-none",
                  "text-sm font-mono leading-relaxed",
                  "placeholder:text-muted-foreground/50"
                )}
              />

              {/* Result */}
              <div
                className={cn(
                  "w-24 text-right text-sm font-mono tabular-nums",
                  result.value !== null
                    ? "text-foreground"
                    : "text-transparent",
                  result.error && "text-destructive"
                )}
              >
                {result.value !== null ? formatNumber(result.value) : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-lg font-mono font-semibold tabular-nums">
            {formatNumber(total)}
          </span>
        </div>
      </div>
    );
  }
  ```

---

## Phase 7: Unified Note Editor Wrapper

### 7.1 Create Note Editor Component
- [ ] Create `src/components/editor/note-editor.tsx`:
  ```typescript
  "use client";

  import { useState } from "react";
  import { Card, CardHeader, CardContent } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Pin, PinOff, Tag } from "lucide-react";
  import { MarkdownEditor } from "./markdown-editor";
  import { CalculatorEditor } from "./calculator-editor";
  import { EditorToolbar } from "./editor-toolbar";
  import { useEditor } from "@tiptap/react";
  import StarterKit from "@tiptap/starter-kit";
  import type { Note } from "@/lib/schema";

  interface NoteEditorProps {
    note: Note;
    onUpdateTitle: (title: string) => void;
    onUpdateContent: (content: any) => void;
    onTogglePin: () => void;
  }

  export function NoteEditor({
    note,
    onUpdateTitle,
    onUpdateContent,
    onTogglePin,
  }: NoteEditorProps) {
    const isCalculator = note.flavour === "calculator";

    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-none space-y-0 pb-2">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <Input
              value={note.title}
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
          <div className="flex items-center gap-2 pt-2">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {note.tags?.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              + Add tag
            </Button>
          </div>
        </CardHeader>

        {/* Toolbar for markdown only */}
        {!isCalculator && <EditorToolbar editor={null} />}

        <CardContent className="flex-1 overflow-auto p-0">
          {isCalculator ? (
            <CalculatorEditor
              lines={note.content?.lines ?? [""]}
              onUpdate={(lines) => onUpdateContent({ lines })}
            />
          ) : (
            <MarkdownEditor
              content={note.content}
              onUpdate={onUpdateContent}
            />
          )}
        </CardContent>
      </Card>
    );
  }
  ```

---

## Phase 8: Main Application Layout

### 8.1 Create Sidebar Component
- [ ] Create `src/components/layout/sidebar.tsx`:
  ```typescript
  "use client";

  import { useState } from "react";
  import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
  import { Button } from "@/components/ui/button";
  import { ScrollArea } from "@/components/ui/scroll-area";
  import { Input } from "@/components/ui/input";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import {
    Menu,
    Plus,
    FolderPlus,
    FileText,
    Calculator,
    Search,
    Settings,
    QrCode,
  } from "lucide-react";
  import { NoteTree, TreeNode } from "@/components/tree/note-tree";

  interface SidebarProps {
    treeData: TreeNode[];
    selectedId: string | null;
    onSelect: (node: TreeNode | null) => void;
    onCreateNote: (flavour: "plain" | "calculator", parentId: string | null) => void;
    onCreateFolder: (parentId: string | null) => void;
    onMove: (args: { dragIds: string[]; parentId: string | null; index: number }) => void;
    onRename: (args: { id: string; name: string }) => void;
    onDelete: (args: { ids: string[] }) => void;
    onOpenSettings: () => void;
  }

  function SidebarContent({
    treeData,
    selectedId,
    onSelect,
    onCreateNote,
    onCreateFolder,
    onMove,
    onRename,
    onDelete,
    onOpenSettings,
  }: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg">Notes</h1>
            <Button variant="ghost" size="icon" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onCreateNote("plain", null)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateNote("calculator", null)}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculator
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFolder(null)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tree */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <NoteTree
              data={treeData}
              onSelect={onSelect}
              onCreate={({ parentId, type }) => {
                if (type === "internal") {
                  onCreateFolder(parentId);
                } else {
                  onCreateNote("plain", parentId);
                }
                return null;
              }}
              onMove={onMove}
              onRename={onRename}
              onDelete={onDelete}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  export function Sidebar(props: SidebarProps) {
    const [open, setOpen] = useState(false);

    return (
      <>
        {/* Mobile: Sheet */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-40">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <SidebarContent {...props} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: Fixed sidebar */}
        <div className="hidden md:block w-80 border-r h-screen">
          <SidebarContent {...props} />
        </div>
      </>
    );
  }
  ```

### 8.2 Create Main Page
- [ ] Update `src/app/page.tsx`:
  ```typescript
  "use client";

  import { useState, useCallback } from "react";
  import { useAccount, useCoState } from "jazz-react";
  import { NotesAccount, Workspace, Note } from "@/lib/schema";
  import { Sidebar } from "@/components/layout/sidebar";
  import { NoteEditor } from "@/components/editor/note-editor";
  import { AuthModal } from "@/components/auth/auth-modal";
  import { DragPreview } from "@/components/tree/drag-preview";
  import { transformToTreeData, transformFromTreeData } from "@/lib/tree-utils";
  import { useToast } from "@/hooks/use-toast";

  export default function Home() {
    const { me } = useAccount<NotesAccount>();
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [showAuth, setShowAuth] = useState(false);
    const { toast } = useToast();

    // Load workspace
    const workspace = useCoState(Workspace, me?.root?.workspace?.id);

    // Load selected note
    const selectedNote = useCoState(Note, selectedNoteId);

    // Show auth if not signed in
    if (!me) {
      return <AuthModal open={true} onOpenChange={setShowAuth} />;
    }

    const treeData = workspace ? transformToTreeData(workspace.rootChildren) : [];

    const handleCreateNote = useCallback(
      (flavour: "plain" | "calculator", parentId: string | null) => {
        // Implementation: Create note in Jazz and add to tree
      },
      [workspace]
    );

    const handleCreateFolder = useCallback(
      (parentId: string | null) => {
        // Check depth limit (max 3)
        // Implementation: Create folder in Jazz
      },
      [workspace, toast]
    );

    const handleMove = useCallback(
      ({ dragIds, parentId, index }) => {
        // If moving folder, check depth limit
        // Implementation: Update Jazz refs
      },
      [workspace, toast]
    );

    return (
      <div className="flex h-screen bg-background">
        <DragPreview />

        <Sidebar
          treeData={treeData}
          selectedId={selectedNoteId}
          onSelect={(node) => setSelectedNoteId(node?.id ?? null)}
          onCreateNote={handleCreateNote}
          onCreateFolder={handleCreateFolder}
          onMove={handleMove}
          onRename={({ id, name }) => {
            // Update name in Jazz
          }}
          onDelete={({ ids }) => {
            // Delete from Jazz
          }}
          onOpenSettings={() => {
            // Open settings modal
          }}
        />

        <main className="flex-1 p-4 md:p-6">
          {selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onUpdateTitle={(title) => {
                selectedNote.title = title;
              }}
              onUpdateContent={(content) => {
                selectedNote.content = content;
                selectedNote.updatedAt = new Date();
              }}
              onTogglePin={() => {
                selectedNote.isPinned = !selectedNote.isPinned;
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a note or create a new one
            </div>
          )}
        </main>
      </div>
    );
  }
  ```

---

## Phase 9: Tags, Pins, and Filtering

### 9.1 Create Tag Management Utilities
- [ ] Create `src/lib/tags.ts`:
  ```typescript
  export function getAllTags(notes: Note[]): string[] {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
      note.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  export function filterByTags(notes: Note[], tags: string[]): Note[] {
    if (tags.length === 0) return notes;
    return notes.filter((note) =>
      tags.some((tag) => note.tags?.includes(tag))
    );
  }
  ```

### 9.2 Update Sidebar with Tag Filter
- [ ] Add tag filter dropdown to sidebar header
- [ ] Filter tree data based on selected tags
- [ ] Show tag count badges

### 9.3 Implement Pin Sorting
- [ ] Create `src/lib/sort.ts`:
  ```typescript
  export function sortWithPins<T extends { isPinned?: boolean }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0; // Maintain relative order
    });
  }
  ```
- [ ] Apply to tree data before rendering

---

## Phase 10: QR Code Seed Sharing

### 10.1 Install QR Code Library
- [ ] Install package:
  ```bash
  pnpm add qrcode.react
  ```

### 10.2 Create Seed Share Modal
- [ ] Create `src/components/auth/seed-share-modal.tsx`:
  ```typescript
  "use client";

  import { useState, useRef, useEffect } from "react";
  import { QRCodeSVG } from "qrcode.react";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Button } from "@/components/ui/button";
  import { usePassphraseAuth } from "jazz-react";
  import { wordlist } from "@/lib/wordlist";
  import { Camera, Copy, Check } from "lucide-react";

  interface SeedShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  export function SeedShareModal({ open, onOpenChange }: SeedShareModalProps) {
    const auth = usePassphraseAuth({ wordlist });
    const [copied, setCopied] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scannedPhrase, setScannedPhrase] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(auth.passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const startScanning = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setScanning(true);
        }
      } catch (error) {
        console.error("Camera access denied:", error);
      }
    };

    const stopScanning = () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
      setScanning(false);
    };

    // QR code scanning logic would go here
    // Using a library like jsQR for decoding

    useEffect(() => {
      return () => {
        if (scanning) stopScanning();
      };
    }, [scanning]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sync to Another Device</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="show">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="show">Show QR</TabsTrigger>
              <TabsTrigger value="scan">Scan QR</TabsTrigger>
            </TabsList>

            <TabsContent value="show" className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={auth.passphrase} size={200} level="M" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code on another device to sync your notes.
              </p>
              <Button onClick={handleCopy} variant="outline" className="w-full">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy phrase
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                {scanning ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Button onClick={startScanning}>
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              {scanning && (
                <Button onClick={stopScanning} variant="outline" className="w-full">
                  Stop Scanning
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }
  ```

### 10.3 Install QR Scanner Library
- [ ] Install jsQR for decoding:
  ```bash
  pnpm add jsqr
  ```
- [ ] Implement frame capture and decode loop in scan tab

---

## Phase 11: Folder Depth Validation

### 11.1 Create Depth Utilities
- [ ] Create `src/lib/folder-depth.ts`:
  ```typescript
  import type { TreeNode } from "@/components/tree/note-tree";

  const MAX_FOLDER_DEPTH = 3;

  /**
   * Calculate the depth of a folder in the tree
   */
  export function getFolderDepth(
    nodeId: string,
    data: TreeNode[],
    currentDepth = 0
  ): number {
    for (const node of data) {
      if (node.id === nodeId) {
        return currentDepth;
      }
      if (node.children) {
        const found = getFolderDepth(nodeId, node.children, currentDepth + 1);
        if (found !== -1) return found;
      }
    }
    return -1; // Not found
  }

  /**
   * Check if moving a folder would exceed max depth
   */
  export function wouldExceedDepth(
    dragNode: TreeNode,
    targetParentId: string | null,
    data: TreeNode[]
  ): boolean {
    if (!dragNode.isFolder) return false; // Notes can go anywhere

    // Get target depth
    const targetDepth = targetParentId
      ? getFolderDepth(targetParentId, data) + 1
      : 0;

    // Get max depth of dragged subtree
    const dragSubtreeDepth = getMaxSubtreeDepth(dragNode);

    return targetDepth + dragSubtreeDepth > MAX_FOLDER_DEPTH;
  }

  /**
   * Get the maximum depth of a subtree (counting only folders)
   */
  function getMaxSubtreeDepth(node: TreeNode): number {
    if (!node.isFolder || !node.children?.length) return 1;

    const folderChildren = node.children.filter((c) => c.isFolder);
    if (folderChildren.length === 0) return 1;

    return 1 + Math.max(...folderChildren.map(getMaxSubtreeDepth));
  }

  /**
   * Check if a new folder can be created at target
   */
  export function canCreateFolderAt(
    parentId: string | null,
    data: TreeNode[]
  ): boolean {
    if (!parentId) return true; // Root level always OK
    const parentDepth = getFolderDepth(parentId, data);
    return parentDepth < MAX_FOLDER_DEPTH - 1;
  }
  ```

### 11.2 Integrate Validation
- [ ] Add validation to `handleMove` in page.tsx
- [ ] Add validation to `handleCreateFolder` in page.tsx
- [ ] Show toast when operation blocked due to depth

---

## Phase 12: Final Integration & Testing

### 12.1 Root Layout Setup
- [ ] Update `src/app/layout.tsx`:
  ```typescript
  import { JazzProvider } from "@/components/providers/jazz-provider";
  import { DnDWrapper } from "@/components/providers/dnd-provider";
  import { Toaster } from "@/components/ui/toaster";
  import { IOSInstallPrompt } from "@/components/ios-install-prompt";
  import "./globals.css";

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="en" className="dark">
        <head>
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
          <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
          <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
        </head>
        <body>
          <JazzProvider>
            <DnDWrapper>
              {children}
              <Toaster />
              <IOSInstallPrompt />
            </DnDWrapper>
          </JazzProvider>
        </body>
      </html>
    );
  }
  ```

### 12.2 Environment Variables
- [ ] Create `.env.local`:
  ```
  NEXT_PUBLIC_JAZZ_PEER=wss://cloud.jazz.tools/?key=your-email@example.com
  ```

### 12.3 Testing Checklist
- [ ] **Desktop Browser**
  - [ ] Create/edit/delete notes
  - [ ] Create/edit/delete folders
  - [ ] Drag-and-drop notes between folders
  - [ ] Drag-and-drop folders (respecting depth limit)
  - [ ] Pin/unpin notes
  - [ ] Tag filtering
  - [ ] Markdown editing
  - [ ] Calculator functionality
  - [ ] QR code generation

- [ ] **iOS Safari (non-PWA)**
  - [ ] All above features
  - [ ] Touch drag-and-drop works smoothly
  - [ ] Touch preview visible during drag
  - [ ] Install prompt appears

- [ ] **iOS PWA (installed to home screen)**
  - [ ] App launches in standalone mode
  - [ ] All features work
  - [ ] Offline fallback works
  - [ ] Status bar styling correct

- [ ] **Multi-device Sync**
  - [ ] Create on device A, appears on device B
  - [ ] Edit syncs in real-time
  - [ ] Delete syncs correctly
  - [ ] QR code sync flow works

---

## File Structure Summary

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── manifest.ts
│   ├── sw.ts
│   ├── globals.css
│   └── ~offline/
│       └── page.tsx
├── components/
│   ├── ui/                    # ShadCN components
│   ├── providers/
│   │   ├── jazz-provider.tsx
│   │   └── dnd-provider.tsx
│   ├── auth/
│   │   ├── auth-modal.tsx
│   │   └── seed-share-modal.tsx
│   ├── layout/
│   │   └── sidebar.tsx
│   ├── tree/
│   │   ├── note-tree.tsx
│   │   └── drag-preview.tsx
│   └── editor/
│       ├── note-editor.tsx
│       ├── markdown-editor.tsx
│       ├── calculator-editor.tsx
│       └── editor-toolbar.tsx
├── lib/
│   ├── schema.ts
│   ├── wordlist.ts
│   ├── calculator.ts
│   ├── folder-depth.ts
│   ├── tags.ts
│   ├── sort.ts
│   ├── tree-utils.ts
│   └── utils.ts
├── hooks/
│   ├── use-notes-account.ts
│   └── use-toast.ts
└── public/
    └── icons/
        ├── icon-192x192.png
        ├── icon-512x512.png
        ├── apple-touch-icon-180x180.png
        ├── apple-touch-icon-152x152.png
        └── apple-touch-icon-120x120.png
```

---

## Dependencies Summary

```json
{
  "dependencies": {
    "@serwist/next": "latest",
    "@tiptap/extension-link": "latest",
    "@tiptap/extension-placeholder": "latest",
    "@tiptap/extension-task-item": "latest",
    "@tiptap/extension-task-list": "latest",
    "@tiptap/pm": "latest",
    "@tiptap/react": "latest",
    "@tiptap/starter-kit": "latest",
    "jazz-react": "latest",
    "jazz-tools": "latest",
    "jsqr": "latest",
    "qrcode.react": "latest",
    "react-arborist": "latest",
    "react-dnd": "latest",
    "react-dnd-html5-backend": "latest",
    "react-dnd-multi-backend": "latest",
    "react-dnd-touch-backend": "latest",
    "rdndmb-html5-to-touch": "latest",
    "use-resize-observer": "latest"
  },
  "devDependencies": {
    "serwist": "latest"
  }
}
```

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Project Setup | ⬜ Not Started | |
| 2. PWA (Serwist) | ⬜ Not Started | |
| 3. Jazz.tools | ⬜ Not Started | |
| 4. React Arborist | ⬜ Not Started | |
| 5. TipTap Editor | ⬜ Not Started | |
| 6. Calculator Editor | ⬜ Not Started | |
| 7. Note Editor Wrapper | ⬜ Not Started | |
| 8. Main Layout | ⬜ Not Started | |
| 9. Tags & Pins | ⬜ Not Started | |
| 10. QR Seed Sharing | ⬜ Not Started | |
| 11. Folder Depth | ⬜ Not Started | |
| 12. Final Testing | ⬜ Not Started | |
