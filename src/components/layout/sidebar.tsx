"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Plus,
  FolderPlus,
  FileText,
  Calculator,
  Search,
  Settings,
} from "lucide-react";
import { NoteTree, TreeNode } from "@/components/tree/note-tree";
import { TagFilter } from "@/components/tree/tag-filter";

interface SidebarProps {
  treeData: TreeNode[];
  selectedId: string | null;
  onSelect: (node: TreeNode | null) => void;
  onCreateNote: (flavour: "plain" | "calculator", parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onMove: (args: { dragIds: string[]; parentId: string | null; index: number }) => void;
  onRename: (args: { id: string; name: string }) => void;
  onDelete: (args: { ids: string[] }) => void;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagCounts?: Map<string, number>;
}

function SidebarContent({
  treeData,
  onSelect,
  onCreateNote,
  onCreateFolder,
  onMove,
  onRename,
  onDelete,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  allTags,
  selectedTags,
  onTagsChange,
  tagCounts,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg">Notes</h1>
          <Button variant="ghost" size="icon" onClick={onOpenSettings}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Tag Filter */}
        <TagFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onTagsChange={onTagsChange}
          tagCounts={tagCounts}
        />

        {/* Actions */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onCreateNote("plain", null)}>
                <FileText className="h-4 w-4 mr-2" />
                Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateNote("calculator", null)}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateFolder(null)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2 h-[calc(100vh-200px)]">
          <NoteTree
            data={treeData}
            onSelect={onSelect}
            onCreate={({ parentId, type }) => {
              if (type === "internal") {
                onCreateFolder(parentId);
              } else {
                onCreateNote("plain", parentId);
              }
              return null;
            }}
            onMove={onMove}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Sheet */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-40">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <SidebarContent {...props} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed sidebar */}
      <div className="hidden md:block w-80 border-r h-screen">
        <SidebarContent {...props} />
      </div>
    </>
  );
}
