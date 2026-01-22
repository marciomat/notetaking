"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  disabled?: boolean;
  data?: Record<string, unknown>;
}

/**
 * A droppable zone component that can receive draggable items.
 * Used for folder drop targets and the root drop zone.
 */
export function DroppableZone({
  id,
  children,
  className,
  activeClassName,
  disabled = false,
  data,
}: DroppableZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    ...(data && { data }),
    disabled,
  });

  const showDropIndicator = isOver && active;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        showDropIndicator && (activeClassName ?? "bg-primary/10 ring-2 ring-primary ring-inset")
      )}
    >
      {children}
    </div>
  );
}
