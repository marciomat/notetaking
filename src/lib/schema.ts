import { co, z, Group } from "jazz-tools";

// ============================================
// NOTE CONTENT TYPES
// ============================================

// TipTap JSON document structure for markdown notes
// We store the raw TipTap JSON as a JSON string since z.unknown() isn't available
export const MarkdownContent = co.map({
  type: z.literal("doc"),
  // Store serialized JSON content as string
  rawContent: z.string(),
});
export type MarkdownContent = co.loaded<typeof MarkdownContent>;

// CoList for calculator lines - enables real-time sync
export const CalculatorLineList = co.list(z.string());
export type CalculatorLineList = co.loaded<typeof CalculatorLineList>;

// Simple text content for calculator notes using CoList for real-time sync
export const CalculatorContent = co.map({
  lines: CalculatorLineList,
});
export type CalculatorContent = co.loaded<typeof CalculatorContent>;

// ============================================
// NOTE TYPES (Flavours)
// ============================================

export const PlainNote = co.map({
  flavour: z.literal("plain"),
  title: z.string(),
  content: MarkdownContent,
  tags: z.array(z.string()),
  isPinned: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PlainNote = co.loaded<typeof PlainNote>;

export const CalculatorNote = co.map({
  flavour: z.literal("calculator"),
  title: z.string(),
  content: CalculatorContent,
  tags: z.array(z.string()),
  isPinned: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type CalculatorNote = co.loaded<typeof CalculatorNote>;

// Union type for notes
export type Note = PlainNote | CalculatorNote;

// ============================================
// FOLDER STRUCTURE
// ============================================

export const FolderItem = co.map({
  itemType: z.literal(["note", "folder"]),
  noteId: z.string().optional(),
  noteFlavour: z.literal(["plain", "calculator"]).optional(),
  folderId: z.string().optional(),
  order: z.number(),
});
export type FolderItem = co.loaded<typeof FolderItem>;

export const FolderItemList = co.list(FolderItem);
export type FolderItemList = co.loaded<typeof FolderItemList>;

export const Folder = co.map({
  name: z.string(),
  depth: z.number(),
  isExpanded: z.boolean(),
  children: FolderItemList,
  createdAt: z.date(),
});
export type Folder = co.loaded<typeof Folder>;

// List of all notes (for easy lookup)
export const NoteList = co.list(PlainNote);
export type NoteList = co.loaded<typeof NoteList>;

export const CalculatorNoteList = co.list(CalculatorNote);
export type CalculatorNoteList = co.loaded<typeof CalculatorNoteList>;

export const FolderList = co.list(Folder);
export type FolderList = co.loaded<typeof FolderList>;

// ============================================
// WORKSPACE (Root)
// ============================================

export const Workspace = co.map({
  name: z.string(),
  rootChildren: FolderItemList,
  allPlainNotes: NoteList,
  allCalculatorNotes: CalculatorNoteList,
  allFolders: FolderList,
});
export type Workspace = co.loaded<typeof Workspace>;

// ============================================
// ACCOUNT
// ============================================

export const NumpadAccountRoot = co.map({
  workspace: Workspace,
});
export type NumpadAccountRoot = co.loaded<typeof NumpadAccountRoot>;

export const NumpadProfile = co.profile({
  name: z.string(),
});
export type NumpadProfile = co.loaded<typeof NumpadProfile>;

export const NumpadAccount = co
  .account({
    root: NumpadAccountRoot,
    profile: NumpadProfile,
  })
  .withMigration(async (account: any) => {
    // Check if root exists - for restored accounts this will be set once sync completes
    if (account.root === undefined) {
      const group = Group.create({ owner: account });

      account.root = NumpadAccountRoot.create(
        {
          workspace: Workspace.create(
            {
              name: "My Notes",
              rootChildren: FolderItemList.create([], { owner: group }),
              allPlainNotes: NoteList.create([], { owner: group }),
              allCalculatorNotes: CalculatorNoteList.create([], { owner: group }),
              allFolders: FolderList.create([], { owner: group }),
            },
            { owner: group }
          ),
        },
        { owner: group }
      );
    }
  });
export type NumpadAccount = co.loaded<typeof NumpadAccount>;
