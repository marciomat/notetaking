import * as Evolu from "@evolu/common";

// Define branded ID types for type safety
export const FolderId = Evolu.id("Folder");
export type FolderId = typeof FolderId.Type;

export const NoteId = Evolu.id("Note");
export type NoteId = typeof NoteId.Type;

// Define the database schema
// System columns (createdAt, updatedAt, isDeleted, ownerId) are added automatically
export const Schema = {
  folder: {
    id: FolderId,
    name: Evolu.NonEmptyString100,
    // Self-referential for nested folders
    parentId: Evolu.nullOr(FolderId),
  },
  note: {
    id: NoteId,
    title: Evolu.NonEmptyString100,
    // Content can be longer, using String1000 or allowing null for empty notes
    content: Evolu.nullOr(Evolu.String),
    // Note can optionally belong to a folder
    folderId: Evolu.nullOr(FolderId),
    // View mode preference: "edit" or "preview" (default: "edit")
    viewMode: Evolu.nullOr(Evolu.NonEmptyString100),
    // Whether the note is pinned (stays at top of list)
    isPinned: Evolu.nullOr(Evolu.SqliteBoolean),
  },
};

export type Schema = typeof Schema;
