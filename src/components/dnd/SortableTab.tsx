"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface SortableTabProps {
  id: string;
  isActive: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * A sortable tab component for the tab bar.
 * Follows the horizontal list sorting strategy.
 */
export function SortableTab({
  id,
  isActive,
  disabled = false,
  children,
  onClick,
  className,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: "tab" },
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex min-w-[120px] max-w-[200px] cursor-grab items-center gap-1 rounded-t-md border border-b-0 px-3 py-1.5 text-sm transition-colors select-none",
        isActive
          ? "border-border bg-background text-foreground"
          : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
        isDragging && "opacity-50 z-50 shadow-lg cursor-grabbing",
        className
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

/**
 * Presentational tab component for the drag overlay.
 * Renders without drag functionality for smooth overlay animations.
 */
interface TabOverlayProps {
  name: string;
  isActive: boolean;
  className?: string;
}

export function TabOverlay({ name, isActive, className }: TabOverlayProps) {
  return (
    <div
      className={cn(
        "flex min-w-[120px] max-w-[200px] items-center gap-1 rounded-t-md border border-b-0 px-3 py-1.5 text-sm shadow-lg cursor-grabbing",
        isActive
          ? "border-border bg-background text-foreground"
          : "border-transparent bg-muted text-muted-foreground",
        className
      )}
    >
      <span className="flex-1 truncate">{name}</span>
    </div>
  );
}
