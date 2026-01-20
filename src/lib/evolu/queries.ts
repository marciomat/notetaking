"use client";

import * as Evolu from "@evolu/common";
import type { FolderId } from "./schema";
import { evolu } from "./database";

// Get the type of our evolu instance
type EvoluInstance = typeof evolu;

// Query factory functions that work with any evolu instance

// Query for all folders (not deleted)
export const createFoldersQuery = (ev: EvoluInstance) =>
  ev.createQuery((db) =>
    db
      .selectFrom("folder")
      .select(["id", "name", "parentId", "createdAt", "updatedAt"])
      .where("isDeleted", "is not", Evolu.sqliteTrue)
      .where("name", "is not", null)
      .$narrowType<{ name: Evolu.kysely.NotNull }>()
      .orderBy(Evolu.kysely.sql`name collate nocase`),
  );

// Query for all notes (not deleted)
// Pinned notes appear first, then unpinned notes, both sorted alphabetically
export const createNotesQuery = (ev: EvoluInstance) =>
  ev.createQuery((db) =>
    db
      .selectFrom("note")
      .select(["id", "title", "content", "folderId", "viewMode", "isPinned", "noteType", "tags", "createdAt", "updatedAt"])
      .where("isDeleted", "is not", Evolu.sqliteTrue)
      .where("title", "is not", null)
      .$narrowType<{ title: Evolu.kysely.NotNull }>()
      .orderBy(Evolu.kysely.sql`isPinned desc, title collate nocase`),
  );

// Query for notes in a specific folder
// Pinned notes appear first, then unpinned notes, both sorted alphabetically
export const createNotesInFolderQuery = (ev: EvoluInstance, folderId: FolderId | null) =>
  ev.createQuery((db) => {
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
export const createSubfoldersQuery = (ev: EvoluInstance, parentId: FolderId | null) =>
  ev.createQuery((db) => {
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
export const createSettingsQuery = (ev: EvoluInstance) =>
  ev.createQuery((db) =>
    db
      .selectFrom("settings")
      .select(["id", "lastSeenNoteId", "updatedAt"])
      .where("isDeleted", "is not", Evolu.sqliteTrue)
      .limit(1),
  );

// Legacy exports for backwards compatibility with default evolu instance

export const foldersQuery = createFoldersQuery(evolu);
export type FolderRow = typeof foldersQuery.Row;

export const notesQuery = createNotesQuery(evolu);
export type NoteRow = typeof notesQuery.Row;

export const settingsQuery = createSettingsQuery(evolu);
