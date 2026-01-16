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
    .orderBy("name"),
);

export type FolderRow = typeof foldersQuery.Row;

// Query for all notes (not deleted)
export const notesQuery = evolu.createQuery((db) =>
  db
    .selectFrom("note")
    .select(["id", "title", "content", "folderId", "createdAt", "updatedAt"])
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .where("title", "is not", null)
    .$narrowType<{ title: Evolu.kysely.NotNull }>()
    .orderBy("updatedAt", "desc"),
);

export type NoteRow = typeof notesQuery.Row;

// Query for notes in a specific folder
export const createNotesInFolderQuery = (folderId: FolderId | null) =>
  evolu.createQuery((db) => {
    let query = db
      .selectFrom("note")
      .select(["id", "title", "content", "folderId", "createdAt", "updatedAt"])
      .where("isDeleted", "is not", Evolu.sqliteTrue)
      .where("title", "is not", null)
      .$narrowType<{ title: Evolu.kysely.NotNull }>()
      .orderBy("updatedAt", "desc");

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
      .orderBy("name");

    if (parentId === null) {
      query = query.where("parentId", "is", null);
    } else {
      query = query.where("parentId", "=", parentId);
    }

    return query;
  });
