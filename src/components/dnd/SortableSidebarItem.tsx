"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { FileText, Calculator, Folder, Pin, GripVertical } from "lucide-react";

export type SidebarItemType = "note" | "calculator" | "folder";

interface SortableSidebarItemProps {
  id: string;
  type: SidebarItemType;
  folderId: string | null;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  depth?: number;
  onTouchStart?: (e: React.TouchEvent) => void;
}

/**
 * A sortable sidebar item component for notes, calculators, and folders.
 * Supports drag and drop to move items between folders.
 */
export function SortableSidebarItem({
  id,
  type,
  folderId,
  disabled = false,
  children,
  className,
  depth = 0,
  onTouchStart,
}: SortableSidebarItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data: { 
      type: type === "folder" ? "folder" : "note",
      itemType: type,
      folderId,
    },
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
    paddingLeft: `${depth * 12 + (type === "folder" ? 8 : 28)}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "opacity-50 z-50 scale-105",
        isOver && type === "folder" && "bg-primary/20 ring-2 ring-primary ring-inset",
        className
      )}
      onTouchStart={onTouchStart}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

/**
 * Presentational component for the drag overlay.
 * Shows a preview of the item being dragged.
 */
interface SidebarItemOverlayProps {
  title: string;
  type: SidebarItemType;
  isPinned?: boolean;
  className?: string;
}

export function SidebarItemOverlay({
  title,
  type,
  isPinned = false,
  className,
}: SidebarItemOverlayProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-background border shadow-lg cursor-grabbing",
        className
      )}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground" />
      {isPinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
      {type === "folder" ? (
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : type === "calculator" ? (
        <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 truncate">{title}</span>
    </div>
  );
}
