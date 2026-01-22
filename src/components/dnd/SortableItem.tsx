"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { DndItemType } from "./DndProvider";

interface SortableItemProps {
  id: string;
  type: DndItemType;
  data?: Record<string, unknown>;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A wrapper component that makes an item sortable using dnd-kit.
 * Uses useSortable hook which combines useDraggable and useDroppable.
 */
export function SortableItem({
  id,
  type,
  data,
  disabled = false,
  children,
  className,
  style,
}: SortableItemProps) {
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
    data: { type, ...data },
    disabled,
  });

  const combinedStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? "default" : "grab",
    touchAction: "none", // Required for touch devices
  };

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={cn(
        isDragging && "z-50 relative",
        isOver && "ring-2 ring-primary ring-inset",
        className
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

/**
 * A simplified draggable item for drag handles.
 * Provides drag listeners that can be attached to a handle element.
 */
interface DraggableHandleProps {
  id: string;
  type: DndItemType;
  data?: Record<string, unknown>;
  disabled?: boolean;
  children: (props: {
    isDragging: boolean;
    listeners: ReturnType<typeof useSortable>["listeners"];
    attributes: ReturnType<typeof useSortable>["attributes"];
    setNodeRef: ReturnType<typeof useSortable>["setNodeRef"];
    setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
  }) => React.ReactNode;
}

/**
 * A render-props component for items that need a separate drag handle.
 * Useful when only part of the item should trigger dragging.
 */
export function DraggableHandle({
  id,
  type,
  data,
  disabled = false,
  children,
}: DraggableHandleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
  } = useSortable({
    id,
    data: { type, ...data },
    disabled,
  });

  return (
    <>
      {children({
        isDragging,
        listeners,
        attributes,
        setNodeRef,
        setActivatorNodeRef,
      })}
    </>
  );
}
