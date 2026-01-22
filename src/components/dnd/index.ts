// Drag and Drop components using @dnd-kit
export { DndProvider, type ActiveDragInfo, type DndItem, type DndItemType } from "./DndProvider";
export { SortableItem, DraggableHandle } from "./SortableItem";
export { DroppableZone } from "./DroppableZone";
export { SortableTab, TabOverlay } from "./SortableTab";
export { SortableSidebarItem, SidebarItemOverlay, type SidebarItemType } from "./SortableSidebarItem";

// Re-export commonly used dnd-kit utilities
export {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

export { useSortable } from "@dnd-kit/sortable";
export { useDroppable, useDraggable } from "@dnd-kit/core";
export { CSS } from "@dnd-kit/utilities";
export type { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";
