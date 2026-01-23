import { co, z, Group } from "jazz-tools";

// ============================================================================
// Folder CoMap
// ============================================================================
export const Folder = co.map({
  name: z.string(),
  // Self-referential for nested folders - use getter for circular reference
  get parentFolder() {
    return co.optional(Folder);
  },
  // Sort order for drag-and-drop reordering
  sortOrder: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Folder = co.loaded<typeof Folder>;
export const FolderList = co.list(Folder);
export type FolderList = co.loaded<typeof FolderList>;

// ============================================================================
// Note CoMap
// ============================================================================
export const Note = co.map({
  title: z.string(),
  content: z.optional(z.string()),
  // Reference to parent folder
  folder: co.optional(Folder),
  // View mode: "edit" or "preview"
  viewMode: z.optional(z.string()),
  // Pin status
  isPinned: z.boolean(),
  // Note type: "text" or "calculator"
  noteType: z.string(),
  // Tags as JSON string for compatibility with Evolu format
  tags: z.optional(z.string()),
  // Calculator state JSON
  calculatorState: z.optional(z.string()),
  // Sort order for drag-and-drop reordering
  sortOrder: z.number(),
  // Soft delete flag
  deleted: z.optional(z.boolean()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Note = co.loaded<typeof Note>;
export const NoteList = co.list(Note);
export type NoteList = co.loaded<typeof NoteList>;

// ============================================================================
// Workspace CoMap - represents a "database tab" in the old Evolu model
// Each workspace has its own notes, folders, and settings
// ============================================================================
export const Workspace = co.map({
  name: z.string(),
  // Notes in this workspace
  get notes() {
    return NoteList;
  },
  // Folders in this workspace
  get folders() {
    return FolderList;
  },
  // Last viewed note (syncs across devices)
  lastSeenNote: co.optional(Note),
  createdAt: z.date(),
});

export type Workspace = co.loaded<typeof Workspace>;
export const WorkspaceList = co.list(Workspace);
export type WorkspaceList = co.loaded<typeof WorkspaceList>;

// ============================================================================
// Account Root - private user data
// ============================================================================
export const NumpadRoot = co.map({
  // All workspaces (each "tab" is a workspace)
  get workspaces() {
    return WorkspaceList;
  },
  // Index of the currently active workspace
  activeWorkspaceIndex: z.optional(z.number()),
});

export type NumpadRoot = co.loaded<typeof NumpadRoot>;

// ============================================================================
// Account Profile - public user data
// ============================================================================
export const NumpadProfile = co.profile({
  name: z.string(),
});

export type NumpadProfile = co.loaded<typeof NumpadProfile>;

// ============================================================================
// Account Schema with Migration
// ============================================================================
export const NumpadAccount = co
  .account({
    root: NumpadRoot,
    profile: NumpadProfile,
  })
  .withMigration((account, creationProps?: { name: string }) => {
    // Initialize root if not exists
    if (!account.$jazz.has("root")) {
      // Create the first default workspace
      const defaultWorkspace = Workspace.create(
        {
          name: "Database 1",
          notes: NoteList.create([], account),
          folders: FolderList.create([], account),
          createdAt: new Date(),
        },
        account
      );

      account.$jazz.set("root", {
        workspaces: WorkspaceList.create([defaultWorkspace], account),
        activeWorkspaceIndex: 0,
      });
    }

    // Initialize profile if not exists
    if (!account.$jazz.has("profile")) {
      const profileGroup = Group.create();
      profileGroup.makePublic();

      account.$jazz.set(
        "profile",
        NumpadProfile.create(
          {
            name: creationProps?.name ?? "Numpad User",
          },
          profileGroup
        )
      );
    }
  });

export type NumpadAccount = co.loaded<typeof NumpadAccount>;

// ============================================================================
// Helper types for loaded states with deep resolution
// ============================================================================
export type LoadedWorkspace = co.loaded<
  typeof Workspace,
  { notes: { $each: true }; folders: { $each: true }; lastSeenNote: true }
>;

export type LoadedNumpadRoot = co.loaded<
  typeof NumpadRoot,
  {
    workspaces: {
      $each: {
        notes: { $each: true };
        folders: { $each: true };
        lastSeenNote: true;
      };
    };
  }
>;
