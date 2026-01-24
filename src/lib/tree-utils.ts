import type { TreeNode } from "@/components/tree/note-tree";
import type {
  Workspace,
  FolderItemList,
  FolderItem,
  Folder,
  PlainNote,
  CalculatorNote,
  Note,
} from "@/lib/schema";

/**
 * Transform Jazz workspace data to tree nodes for react-arborist
 * @param workspace - The workspace containing all notes and folders
 * @param filterTags - Optional tags to filter notes by (notes must have at least one of these tags)
 */
export function transformToTreeData(
  workspace: Workspace | null | undefined,
  filterTags: string[] = []
): TreeNode[] {
  if (!workspace) return [];

  const plainNotesMap = new Map<string, PlainNote>();
  const calcNotesMap = new Map<string, CalculatorNote>();
  const foldersMap = new Map<string, Folder>();

  // Helper to check if a note matches the tag filter
  const noteMatchesTags = (note: PlainNote | CalculatorNote): boolean => {
    if (filterTags.length === 0) return true;
    if (!note.tags || note.tags.length === 0) return false;
    for (let i = 0; i < note.tags.length; i++) {
      if (filterTags.includes(note.tags[i])) return true;
    }
    return false;
  };

  // Build lookup maps
  if (workspace.allPlainNotes) {
    for (let i = 0; i < workspace.allPlainNotes.length; i++) {
      const note = workspace.allPlainNotes[i];
      if (note) plainNotesMap.set(note.id, note);
    }
  }

  if (workspace.allCalculatorNotes) {
    for (let i = 0; i < workspace.allCalculatorNotes.length; i++) {
      const note = workspace.allCalculatorNotes[i];
      if (note) calcNotesMap.set(note.id, note);
    }
  }

  if (workspace.allFolders) {
    for (let i = 0; i < workspace.allFolders.length; i++) {
      const folder = workspace.allFolders[i];
      if (folder) foldersMap.set(folder.id, folder);
    }
  }

  // Transform folder items to tree nodes
  function transformItems(items: FolderItemList | null | undefined): TreeNode[] {
    if (!items) return [];

    const nodes: TreeNode[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      if (item.itemType === "folder" && item.folderId) {
        const folder = foldersMap.get(item.folderId);
        if (folder) {
          const children = transformItems(folder.children);
          // Include folder if it has matching children or no tag filter is active
          if (children.length > 0 || filterTags.length === 0) {
            nodes.push({
              id: folder.id,
              name: folder.name || "Untitled Folder",
              isFolder: true,
              children,
            });
          }
        }
      } else if (item.itemType === "note" && item.noteId) {
        const note =
          item.noteFlavour === "calculator"
            ? calcNotesMap.get(item.noteId)
            : plainNotesMap.get(item.noteId);

        if (note && noteMatchesTags(note)) {
          nodes.push({
            id: note.id,
            name: note.title || "Untitled",
            isFolder: false,
            isPinned: note.isPinned,
            flavour: item.noteFlavour === "calculator" ? "calculator" : "plain",
          });
        }
      }
    }

    // Sort: pinned first, then by order
    return nodes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }

  return transformItems(workspace.rootChildren);
}

/**
 * Filter tree nodes by search query
 */
export function filterTreeBySearch(
  nodes: TreeNode[],
  query: string
): TreeNode[] {
  if (!query.trim()) return nodes;

  const lowerQuery = query.toLowerCase();

  function filterNode(node: TreeNode): TreeNode | null {
    const nameMatches = node.name.toLowerCase().includes(lowerQuery);

    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is TreeNode => n !== null);

      if (filteredChildren.length > 0 || nameMatches) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
    }

    return nameMatches ? node : null;
  }

  return nodes.map(filterNode).filter((n): n is TreeNode => n !== null);
}

/**
 * Get all tags from workspace notes
 */
export function getAllTags(workspace: Workspace | null | undefined): string[] {
  if (!workspace) return [];

  const tagSet = new Set<string>();

  if (workspace.allPlainNotes) {
    for (let i = 0; i < workspace.allPlainNotes.length; i++) {
      const note = workspace.allPlainNotes[i];
      if (note?.tags) {
        note.tags.forEach((tag) => tagSet.add(tag));
      }
    }
  }

  if (workspace.allCalculatorNotes) {
    for (let i = 0; i < workspace.allCalculatorNotes.length; i++) {
      const note = workspace.allCalculatorNotes[i];
      if (note?.tags) {
        note.tags.forEach((tag) => tagSet.add(tag));
      }
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Find a note by ID in workspace
 */
export function findNote(
  workspace: Workspace | null | undefined,
  noteId: string
): Note | null {
  if (!workspace) return null;

  if (workspace.allPlainNotes) {
    for (let i = 0; i < workspace.allPlainNotes.length; i++) {
      const note = workspace.allPlainNotes[i];
      if (note?.id === noteId) return note;
    }
  }

  if (workspace.allCalculatorNotes) {
    for (let i = 0; i < workspace.allCalculatorNotes.length; i++) {
      const note = workspace.allCalculatorNotes[i];
      if (note?.id === noteId) return note;
    }
  }

  return null;
}

/**
 * Find a folder by ID in workspace
 */
export function findFolder(
  workspace: Workspace | null | undefined,
  folderId: string
): Folder | null {
  if (!workspace?.allFolders) return null;

  for (let i = 0; i < workspace.allFolders.length; i++) {
    const folder = workspace.allFolders[i];
    if (folder?.id === folderId) return folder;
  }

  return null;
}
