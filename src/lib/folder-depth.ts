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
 * Find a node by ID in the tree
 */
export function findNode(
  nodeId: string,
  data: TreeNode[]
): TreeNode | null {
  for (const node of data) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children) {
      const found = findNode(nodeId, node.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get the maximum depth of a subtree (counting only folders)
 */
export function getMaxSubtreeDepth(node: TreeNode): number {
  if (!node.isFolder || !node.children?.length) return 1;

  const folderChildren = node.children.filter((c) => c.isFolder);
  if (folderChildren.length === 0) return 1;

  return 1 + Math.max(...folderChildren.map(getMaxSubtreeDepth));
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

/**
 * Get the current depth limit message
 */
export function getDepthLimitMessage(): string {
  return `Folders can only be nested up to ${MAX_FOLDER_DEPTH} levels deep`;
}
