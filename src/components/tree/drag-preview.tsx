"use client";

import { usePreview } from "react-dnd-multi-backend";
import { Card } from "@/components/ui/card";
import { File, Folder } from "lucide-react";

interface DragItem {
  id: string;
  name: string;
  isFolder: boolean;
}

export function DragPreview() {
  const preview = usePreview<DragItem>();

  if (!preview.display) return null;

  const { item, style } = preview;

  return (
    <div style={{ ...style, zIndex: 9999, pointerEvents: "none" }}>
      <Card className="px-3 py-2 flex items-center gap-2 bg-accent shadow-lg">
        {item.isFolder ? (
          <Folder className="h-4 w-4" />
        ) : (
          <File className="h-4 w-4" />
        )}
        <span className="text-sm truncate max-w-[150px]">{item.name}</span>
      </Card>
    </div>
  );
}
