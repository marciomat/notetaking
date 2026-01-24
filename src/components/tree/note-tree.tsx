"use client";

import { Tree, NodeRendererProps, TreeApi } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import useResizeObserver from "use-resize-observer";
import { cn } from "@/lib/utils";
import { Folder, File, ChevronRight, ChevronDown, Pin, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  onRenameClick?: (id: string, currentName: string) => void;
  onDeleteClick?: (ids: string[]) => void;
}

export interface NoteTreeRef {
  editNode: (id: string) => void;
}

// Store the rename callback in a module-level variable that the renderer can access
let renameClickCallback: ((id: string, currentName: string) => void) | null = null;
let deleteClickCallback: ((ids: string[]) => void) | null = null;

function TreeNodeRenderer({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer select-none",
        "touch-action-none", // Critical for iOS touch DnD
        node.isSelected && "bg-accent",
        node.isFocused && "ring-1 ring-ring"
      )}
      onClick={() => node.select()}
      onDoubleClick={() => {
        if (node.isInternal) {
          node.toggle();
        } else {
          node.edit();
        }
      }}
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

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-8 w-8 hover:bg-accent shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-6 sm:w-6", // iOS touch target
              // Show on hover (desktop) or when selected (mobile/touch)
              "opacity-0 group-hover:opacity-100 transition-opacity",
              node.isSelected && "opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              node.select();
            }}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (renameClickCallback) {
                renameClickCallback(node.id, node.data.name);
              } else {
                node.edit();
              }
            }}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (deleteClickCallback) {
                deleteClickCallback([node.id]);
              } else {
                node.tree.delete([node.id]);
              }
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const NoteTree = forwardRef<NoteTreeRef, NoteTreeProps>(function NoteTree(
  {
    data,
    onSelect,
    onCreate,
    onMove,
    onRename,
    onDelete,
    onRenameClick,
    onDeleteClick,
  },
  ref
) {
  const { ref: containerRef, width, height } = useResizeObserver<HTMLDivElement>();
  const dndManager = useDragDropManager();
  const treeRef = useRef<TreeApi<TreeNode>>(null);

  // Set the callbacks for the renderer to use
  useEffect(() => {
    renameClickCallback = onRenameClick || null;
    deleteClickCallback = onDeleteClick || null;
    return () => {
      renameClickCallback = null;
      deleteClickCallback = null;
    };
  }, [onRenameClick, onDeleteClick]);

  // Expose editNode method to parent (for future use)
  useImperativeHandle(ref, () => ({
    editNode: (id: string) => {
      const node = treeRef.current?.get(id);
      if (node) {
        node.select();
        node.edit();
      }
    },
  }));

  // Validate folder depth on move
  const handleMove = (args: { dragIds: string[]; parentId: string | null; index: number }) => {
    onMove(args);
  };

  // Handle delete with confirmation
  const handleDelete = (args: { ids: string[] }) => {
    if (onDeleteClick) {
      onDeleteClick(args.ids);
    } else {
      onDelete(args);
    }
  };

  // Prevent keyboard shortcuts that could cause accidental actions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Block 'a' (create), 'f' (create folder), 'r' (rename), etc.
    const blockedKeys = ['a', 'f', 'r', 'n'];
    if (blockedKeys.includes(e.key.toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Block F2 (rename)
    if (e.key === 'F2') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full" onKeyDown={handleKeyDown}>
      <Tree
        ref={treeRef}
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
        onDelete={handleDelete}
        onSelect={(nodes) => {
          const selected = nodes[0]?.data ?? null;
          onSelect(selected);
        }}
        // Disable keyboard shortcuts to prevent accidental changes
        disableEdit
        disableMultiSelection
        // Custom key handling - only allow navigation and expansion
        onActivate={() => {}} // Disable 'a' (create) and other activation shortcuts
      >
        {TreeNodeRenderer}
      </Tree>
    </div>
  );
});
