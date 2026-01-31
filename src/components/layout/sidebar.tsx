"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FolderPlus,
  FileText,
  Calculator,
  Search,
  Settings,
  Menu,
  PanelLeftClose,
} from "lucide-react";
import { NoteTree, TreeNode, NoteTreeRef } from "@/components/tree/note-tree";
import { TagFilter } from "@/components/tree/tag-filter";

interface SidebarProps {
  treeData: TreeNode[];
  selectedId: string | null;
  onSelect: (node: TreeNode | null) => void;
  onCreateNote: (flavour: "plain" | "calculator", parentId: string | null, name?: string) => string | null;
  onCreateFolder: (parentId: string | null, name?: string) => string | null;
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
  treeRef?: React.RefObject<NoteTreeRef>;
  children?: React.ReactNode;
}

// The actual sidebar content
function SidebarContent({
  treeData,
  selectedId,
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
  treeRef,
  onNoteClick,
  onCollapse,
}: Omit<SidebarProps, "children"> & { onNoteClick?: () => void; onCollapse?: () => void }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createItemType, setCreateItemType] = useState<"note" | "calculator" | "folder">("note");
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemIds, setDeleteItemIds] = useState<string[]>([]);
  const [deleteItemName, setDeleteItemName] = useState("");

  useEffect(() => {
    if (renameDialogOpen && renameInputRef.current) {
      requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        setTimeout(() => {
          renameInputRef.current?.select();
        }, 100);
      });
    }
  }, [renameDialogOpen]);

  const findNodeById = (nodes: TreeNode[], id: string | null): TreeNode | null => {
    if (!id) return null;
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleCreateClick = (type: "note" | "calculator" | "folder", parentId: string | null = null) => {
    setCreateItemType(type);
    if (parentId === null && selectedId) {
      const selected = findNodeById(treeData, selectedId);
      if (selected?.isFolder) {
        parentId = selectedId;
      }
    }
    setCreateParentId(parentId);
    setItemName(
      type === "folder" ? "New Folder" :
      type === "calculator" ? "Untitled Calculator" :
      "Untitled Note"
    );
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!itemName.trim()) return;
    if (createItemType === "folder") {
      onCreateFolder(createParentId, itemName);
    } else {
      onCreateNote(createItemType === "calculator" ? "calculator" : "plain", createParentId, itemName);
    }
    setCreateDialogOpen(false);
    setItemName("");
  };

  const handleRenameClick = (id: string, currentName: string) => {
    setRenameItemId(id);
    setRenameValue(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (!renameValue.trim() || !renameItemId) return;
    onRename({ id: renameItemId, name: renameValue });
    setRenameDialogOpen(false);
    setRenameItemId(null);
    setRenameValue("");
  };

  const handleDeleteClick = (ids: string[]) => {
    setDeleteItemIds(ids);
    const firstNode = findNodeById(treeData, ids[0]);
    setDeleteItemName(firstNode?.name || "this item");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete({ ids: deleteItemIds });
    setDeleteDialogOpen(false);
    setDeleteItemIds([]);
    setDeleteItemName("");
  };

  return (
    <>
      {/* Dialogs */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create {createItemType === "folder" ? "Folder" : createItemType === "calculator" ? "Calculator" : "Note"}
            </DialogTitle>
            <DialogDescription>
              Enter a name for your new {createItemType === "folder" ? "folder" : createItemType}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSubmit();
              if (e.key === "Escape") setCreateDialogOpen(false);
            }}
            placeholder="Enter name..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
            <DialogDescription>Enter a new name for this item.</DialogDescription>
          </DialogHeader>
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") setRenameDialogOpen(false);
            }}
            placeholder="Enter name..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSubmit}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteItemName}&quot;?
              {deleteItemIds.length > 1 && ` and ${deleteItemIds.length - 1} other item(s)`}
              {" "}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar content */}
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg">Notes</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onOpenSettings}>
                <Settings className="h-4 w-4" />
              </Button>
              {onCollapse && (
                <Button variant="ghost" size="icon" onClick={onCollapse}>
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              )}
            </div>
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
                <DropdownMenuItem onClick={() => handleCreateClick("note")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateClick("calculator")}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculator
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateClick("folder")}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tree */}
        <ScrollArea className="flex-1">
          <div className="p-2 h-[calc(100vh-280px)]">
            <NoteTree
              ref={treeRef}
              data={treeData}
              selectedId={selectedId}
              onSelect={onSelect}
              onNoteClick={onNoteClick}
              onCreate={({ parentId, type }) => {
                handleCreateClick(type === "internal" ? "folder" : "note", parentId);
                return null;
              }}
              onMove={onMove}
              onRename={onRename}
              onRenameClick={handleRenameClick}
              onDelete={onDelete}
              onDeleteClick={handleDeleteClick}
            />
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

export function Sidebar({ children, ...props }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Close mobile sidebar when a note is clicked
  const handleNoteClick = () => {
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Mobile: Sheet-based sidebar (hidden on md+) */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SidebarContent {...props} onNoteClick={handleNoteClick} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed sidebar (hidden on mobile) */}
      <div className={`hidden md:block border-r h-screen transition-all duration-200 ${desktopCollapsed ? "w-12" : "w-80"}`}>
        {desktopCollapsed ? (
          <div className="p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDesktopCollapsed(false)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <SidebarContent {...props} onCollapse={() => setDesktopCollapsed(true)} />
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header (hidden on md+) */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-medium truncate">
            {props.selectedId ? props.treeData.find(n => n.id === props.selectedId)?.name || "Notes" : "Notes"}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// For backwards compatibility
export function MobileHeader({ title }: { title?: string }) {
  return null;
}
