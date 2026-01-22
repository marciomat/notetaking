"use client";

import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

export type DndItemType = "note" | "folder" | "tab";

export interface DndItem {
  id: UniqueIdentifier;
  type: DndItemType;
  data?: Record<string, unknown>;
}

export interface ActiveDragInfo {
  id: UniqueIdentifier;
  type: DndItemType;
  data?: Record<string, unknown>;
}

interface DndProviderProps {
  children: React.ReactNode;
  onDragEnd?: (event: DragEndEvent, activeType: DndItemType | null) => void;
  onDragOver?: (event: DragOverEvent, activeType: DndItemType | null) => void;
  renderDragOverlay?: (activeInfo: ActiveDragInfo | null) => React.ReactNode;
}

/**
 * Main DnD Provider that wraps the application to enable drag and drop functionality.
 * Configures sensors for pointer, touch, and keyboard interactions following dnd-kit best practices.
 */
export function DndProvider({
  children,
  onDragEnd,
  onDragOver,
  renderDragOverlay,
}: DndProviderProps) {
  const [activeInfo, setActiveInfo] = useState<ActiveDragInfo | null>(null);

  // Configure sensors with activation constraints
  // PointerSensor: requires 8px movement before activating (prevents accidental drags)
  // TouchSensor: 200ms delay with 5px tolerance for mobile touch interactions
  // KeyboardSensor: uses sortable keyboard coordinates for accessible navigation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type as DndItemType | undefined;
    const data = active.data.current as Record<string, unknown> | undefined;

    if (type) {
      setActiveInfo({
        id: active.id,
        type,
        ...(data && { data }),
      });
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      onDragOver?.(event, activeInfo?.type ?? null);
    },
    [activeInfo, onDragOver]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      onDragEnd?.(event, activeInfo?.type ?? null);
      setActiveInfo(null);
    },
    [activeInfo, onDragEnd]
  );

  const handleDragCancel = useCallback(() => {
    setActiveInfo(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {renderDragOverlay?.(activeInfo)}
      </DragOverlay>
    </DndContext>
  );
}
