"use client";

import { Tree, NodeRendererProps } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import useResizeObserver from "use-resize-observer";
import { cn } from "@/lib/utils";
import { Folder, File, ChevronRight, ChevronDown, Pin } from "lucide-react";

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
}

function TreeNodeRenderer({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer select-none",
        "touch-action-none", // Critical for iOS touch DnD
        node.isSelected && "bg-accent",
        node.isFocused && "ring-1 ring-ring"
      )}
      onClick={() => node.select()}
      onDoubleClick={() => node.isInternal && node.toggle()}
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
    </div>
  );
}

export function NoteTree({
  data,
  onSelect,
  onCreate,
  onMove,
  onRename,
  onDelete,
}: NoteTreeProps) {
  const { ref, width, height } = useResizeObserver<HTMLDivElement>();
  const dndManager = useDragDropManager();

  // Validate folder depth on move
  const handleMove = (args: { dragIds: string[]; parentId: string | null; index: number }) => {
    // Check if moving a folder would exceed depth 3
    // Implementation will check target depth and block if folder would exceed limit
    onMove(args);
  };

  return (
    <div ref={ref} className="h-full w-full">
      <Tree
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
        onDelete={onDelete}
        onSelect={(nodes) => {
          const selected = nodes[0]?.data ?? null;
          onSelect(selected);
        }}
      >
        {TreeNodeRenderer}
      </Tree>
    </div>
  );
}
