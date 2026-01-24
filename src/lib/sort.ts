import type { TreeNode } from "@/components/tree/note-tree";

/**
 * Sort items with pinned items first, maintaining relative order within groups
 */
export function sortWithPins<T extends { isPinned?: boolean }>(items: T[]): T[] {
  const pinned: T[] = [];
  const unpinned: T[] = [];

  for (const item of items) {
    if (item.isPinned) {
      pinned.push(item);
    } else {
      unpinned.push(item);
    }
  }

  return [...pinned, ...unpinned];
}

/**
 * Sort tree nodes with pinned notes first within each level
 * Folders are always sorted after pinned notes but before unpinned notes
 */
export function sortTreeWithPins(nodes: TreeNode[]): TreeNode[] {
  const pinnedNotes: TreeNode[] = [];
  const folders: TreeNode[] = [];
  const unpinnedNotes: TreeNode[] = [];

  for (const node of nodes) {
    if (node.isFolder) {
      // Recursively sort folder children
      folders.push({
        ...node,
        children: node.children ? sortTreeWithPins(node.children) : undefined,
      });
    } else if (node.isPinned) {
      pinnedNotes.push(node);
    } else {
      unpinnedNotes.push(node);
    }
  }

  return [...pinnedNotes, ...folders, ...unpinnedNotes];
}

/**
 * Sort by date (newest first)
 */
export function sortByDate<T extends { createdAt?: Date; updatedAt?: Date }>(
  items: T[],
  field: "createdAt" | "updatedAt" = "updatedAt"
): T[] {
  return [...items].sort((a, b) => {
    const dateA = a[field]?.getTime() || 0;
    const dateB = b[field]?.getTime() || 0;
    return dateB - dateA;
  });
}

/**
 * Sort alphabetically by name/title
 */
export function sortAlphabetically<T extends { name?: string; title?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const nameA = (a.name || a.title || "").toLowerCase();
    const nameB = (b.name || b.title || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}
