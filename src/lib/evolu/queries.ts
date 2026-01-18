"use client";

import * as Evolu from "@evolu/common";
import { evolu } from "./database";
import type { FolderId } from "./schema";

// Query for all folders (not deleted)
export const foldersQuery = evolu.createQuery((db) =>
  db
    .selectFrom("folder")
    .select(["id", "name", "parentId", "createdAt", "updatedAt"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("name", "is not", null)
    .$narrowType<{ name: Evolu.kysely.NotNull }>()
    .orderBy(Evolu.kysely.sql`name collate nocase`),
);

export type FolderRow = typeof foldersQuery.Row;

// Query for all notes (not deleted)
// Pinned notes appear first, then unpinned notes, both sorted alphabetically
export const notesQuery = evolu.createQuery((db) =>
  db
    .selectFrom("note")
    .select(["id", "title", "content", "folderId", "viewMode", "isPinned", "noteType", "tags", "createdAt", "updatedAt"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("title", "is not", null)
    .$narrowType<{ title: Evolu.kysely.NotNull }>()
    .orderBy(Evolu.kysely.sql`isPinned desc, title collate nocase`),
);

export type NoteRow = typeof notesQuery.Row;

// Query for notes in a specific folder
// Pinned notes appear first, then unpinned notes, both sorted alphabetically
export const createNotesInFolderQuery = (folderId: FolderId | null) =>
  evolu.createQuery((db) => {
    let query = db
      .selectFrom("note")
      .select(["id", "title", "content", "folderId", "viewMode", "isPinned", "noteType", "tags", "createdAt", "updatedAt"])
      .where("isDeleted", "is not", Evolu.sqliteTrue)
      .where("title", "is not", null)
      .$narrowType<{ title: Evolu.kysely.NotNull }>()
      .orderBy(Evolu.kysely.sql`isPinned desc, title collate nocase`);

    if (folderId === null) {
      query = query.where("folderId", "is", null);
    } else {
      query = query.where("folderId", "=", folderId);
    }

    return query;
  });

// Query for subfolders of a specific folder
export const createSubfoldersQuery = (parentId: FolderId | null) =>
  evolu.createQuery((db) => {
    let query = db
      .selectFrom("folder")
      .select(["id", "name", "parentId", "createdAt", "updatedAt"])
      .where("isDeleted", "is not", Evolu.sqliteTrue)
      .where("name", "is not", null)
      .$narrowType<{ name: Evolu.kysely.NotNull }>()
      .orderBy(Evolu.kysely.sql`name collate nocase`);

    if (parentId === null) {
      query = query.where("parentId", "is", null);
    } else {
      query = query.where("parentId", "=", parentId);
    }

    return query;
  });

// Query for user settings
export const settingsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("settings")
    .select(["id", "lastSeenNoteId", "updatedAt"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .limit(1),
);
