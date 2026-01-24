"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useAccount, useIsAuthenticated } from "jazz-react";
import { Group } from "jazz-tools";
import {
  NumpadAccount,
  Workspace,
  PlainNote,
  CalculatorNote,
  Folder,
  FolderItem,
  FolderItemList,
  MarkdownContent,
  CalculatorContent,
  Note,
} from "@/lib/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { NoteTreeRef } from "@/components/tree/note-tree";
import { NoteEditor } from "@/components/editor/note-editor";
import { AuthModal } from "@/components/auth/auth-modal";
import { SettingsModal } from "@/components/settings/settings-modal";
import { DragPreview } from "@/components/tree/drag-preview";
import { transformToTreeData, filterTreeBySearch, findNote, findFolder, getAllTags } from "@/lib/tree-utils";
import { canCreateFolderAt, getDepthLimitMessage, wouldExceedDepth, findNode } from "@/lib/folder-depth";
import { sortTreeWithPins } from "@/lib/sort";
import { getTagCounts } from "@/lib/tags";
import { toast } from "sonner";

export default function Home() {
  const isAuthenticated = useIsAuthenticated();
  const { me } = useAccount(NumpadAccount, {
    resolve: {
      root: {
        workspace: {
          rootChildren: { $each: true },
          allPlainNotes: { $each: true },
          allCalculatorNotes: { $each: true },
          allFolders: { $each: { children: { $each: true } } },
        },
      },
    },
  });

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const treeRef = useRef<NoteTreeRef>(null);

  const workspace = me?.root?.workspace;

  // Get all tags from workspace
  const allTags = useMemo(() => getAllTags(workspace), [workspace]);

  // Get tag counts for display
  const tagCounts = useMemo(() => {
    const allNotes = [
      ...(workspace?.allPlainNotes || []),
      ...(workspace?.allCalculatorNotes || []),
    ];
    return getTagCounts(allNotes);
  }, [workspace]);

  // Get raw tree data (for depth checking)
  const rawTreeData = useMemo(() => {
    return transformToTreeData(workspace, []);
  }, [workspace]);

  // Get tree data with filtering and sorting
  const treeData = useMemo(() => {
    let data = transformToTreeData(workspace, selectedTags);
    data = filterTreeBySearch(data, searchQuery);
    data = sortTreeWithPins(data);
    return data;
  }, [workspace, selectedTags, searchQuery]);

  // Get selected note
  const selectedNote = selectedNoteId ? findNote(workspace, selectedNoteId) : null;

  // Create a new note
  const handleCreateNote = useCallback(
    (flavour: "plain" | "calculator", parentId: string | null, name?: string): string | null => {
      if (!workspace || !me) return null;

      const group = workspace._owner as Group;
      const now = new Date();

      let note: PlainNote | CalculatorNote;
      let noteId: string;

      const defaultTitle = flavour === "calculator" ? "Untitled Calculator" : "Untitled Note";
      const title = name || defaultTitle;

      if (flavour === "calculator") {
        const content = CalculatorContent.create({ lines: [""] }, { owner: group });
        note = CalculatorNote.create(
          {
            flavour: "calculator",
            title,
            content,
            tags: [],
            isPinned: false,
            createdAt: now,
            updatedAt: now,
          },
          { owner: group }
        );
        noteId = note.id;
        workspace.allCalculatorNotes?.push(note);
      } else {
        const content = MarkdownContent.create(
          { type: "doc", rawContent: "[]" },
          { owner: group }
        );
        note = PlainNote.create(
          {
            flavour: "plain",
            title,
            content,
            tags: [],
            isPinned: false,
            createdAt: now,
            updatedAt: now,
          },
          { owner: group }
        );
        noteId = note.id;
        workspace.allPlainNotes?.push(note);
      }

      // Create folder item
      const folderItem = FolderItem.create(
        {
          itemType: "note",
          noteId,
          noteFlavour: flavour,
          order: 0,
        },
        { owner: group }
      );

      // Add to parent or root
      if (parentId) {
        const parentFolder = findFolder(workspace, parentId);
        if (parentFolder?.children) {
          parentFolder.children.push(folderItem);
        }
      } else {
        workspace.rootChildren?.push(folderItem);
      }

      setSelectedNoteId(noteId);
      return noteId;
    },
    [workspace, me]
  );

  // Create a new folder
  const handleCreateFolder = useCallback(
    (parentId: string | null, name?: string): string | null => {
      if (!workspace || !me) return null;

      // Check depth limit
      if (!canCreateFolderAt(parentId, rawTreeData)) {
        toast.error(getDepthLimitMessage());
        return null;
      }

      const group = workspace._owner as Group;
      const now = new Date();

      const depth = parentId ? (findFolder(workspace, parentId)?.depth ?? 0) + 1 : 0;
      const folderName = name || "New Folder";

      const folder = Folder.create(
        {
          name: folderName,
          depth,
          isExpanded: true,
          children: FolderItemList.create([], { owner: group }),
          createdAt: now,
        },
        { owner: group }
      );

      workspace.allFolders?.push(folder);

      const folderItem = FolderItem.create(
        {
          itemType: "folder",
          folderId: folder.id,
          order: 0,
        },
        { owner: group }
      );

      if (parentId) {
        const parentFolder = findFolder(workspace, parentId);
        if (parentFolder?.children) {
          parentFolder.children.push(folderItem);
        }
      } else {
        workspace.rootChildren?.push(folderItem);
      }

      return folder.id;
    },
    [workspace, me, rawTreeData]
  );

  // Helper to find and remove a folder item from its parent
  const removeFolderItem = useCallback(
    (itemId: string, isFolder: boolean): { item: FolderItem; fromList: FolderItemList } | null => {
      if (!workspace) return null;

      // Helper to search in a list
      const searchInList = (list: FolderItemList | null | undefined): { item: FolderItem; fromList: FolderItemList; index: number } | null => {
        if (!list) return null;
        for (let i = 0; i < list.length; i++) {
          const folderItem = list[i];
          if (!folderItem) continue;
          
          if (isFolder && folderItem.itemType === "folder" && folderItem.folderId === itemId) {
            return { item: folderItem, fromList: list, index: i };
          }
          if (!isFolder && folderItem.itemType === "note" && folderItem.noteId === itemId) {
            return { item: folderItem, fromList: list, index: i };
          }
        }
        return null;
      };

      // Check root
      const rootResult = searchInList(workspace.rootChildren);
      if (rootResult) {
        workspace.rootChildren?.splice(rootResult.index, 1);
        return { item: rootResult.item, fromList: rootResult.fromList };
      }

      // Check all folders
      if (workspace.allFolders) {
        for (let i = 0; i < workspace.allFolders.length; i++) {
          const folder = workspace.allFolders[i];
          if (folder?.children) {
            const result = searchInList(folder.children);
            if (result) {
              folder.children.splice(result.index, 1);
              return { item: result.item, fromList: result.fromList };
            }
          }
        }
      }

      return null;
    },
    [workspace]
  );

  // Handle move (drag and drop)
  const handleMove = useCallback(
    ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
      if (!workspace) return;

      // Check depth for folders
      for (const dragId of dragIds) {
        const dragNode = findNode(dragId, rawTreeData);
        if (dragNode && wouldExceedDepth(dragNode, parentId, rawTreeData)) {
          toast.error(getDepthLimitMessage());
          return;
        }
      }

      // Move each item
      for (const dragId of dragIds) {
        const dragNode = findNode(dragId, rawTreeData);
        if (!dragNode) continue;

        // Remove from old location
        const removed = removeFolderItem(dragId, dragNode.isFolder);
        if (!removed) continue;

        // Get target list
        const targetList = parentId
          ? findFolder(workspace, parentId)?.children
          : workspace.rootChildren;

        if (!targetList) continue;

        // Update folder depth if moving a folder
        if (dragNode.isFolder) {
          const folder = findFolder(workspace, dragId);
          if (folder) {
            const newDepth = parentId
              ? (findFolder(workspace, parentId)?.depth ?? 0) + 1
              : 0;
            folder.depth = newDepth;
          }
        }

        // Insert at new position
        const insertIndex = Math.min(index, targetList.length);
        targetList.splice(insertIndex, 0, removed.item);

        // Update order values
        for (let i = 0; i < targetList.length; i++) {
          const item = targetList[i];
          if (item) item.order = i;
        }
      }

      toast.success("Moved successfully");
    },
    [workspace, rawTreeData, removeFolderItem]
  );

  // Handle rename
  const handleRename = useCallback(
    ({ id, name }: { id: string; name: string }) => {
      if (!workspace) return;

      // Check if it's a note
      const note = findNote(workspace, id);
      if (note) {
        note.title = name;
        return;
      }

      // Check if it's a folder
      const folder = findFolder(workspace, id);
      if (folder) {
        folder.name = name;
      }
    },
    [workspace]
  );

  // Handle delete
  const handleDelete = useCallback(
    ({ ids }: { ids: string[] }) => {
      if (!workspace) return;

      for (const id of ids) {
        const node = findNode(id, rawTreeData);
        if (!node) continue;

        // Remove folder item from parent
        removeFolderItem(id, node.isFolder);

        // Remove from workspace lists
        if (node.isFolder) {
          // Remove folder and all nested items recursively
          const deleteFolder = (folderId: string) => {
            const folder = findFolder(workspace, folderId);
            if (!folder?.children) return;

            // Delete children first
            for (let i = folder.children.length - 1; i >= 0; i--) {
              const child = folder.children[i];
              if (!child) continue;

              if (child.itemType === "folder" && child.folderId) {
                deleteFolder(child.folderId);
              } else if (child.itemType === "note" && child.noteId) {
                // Remove note from appropriate list
                if (child.noteFlavour === "calculator" && workspace.allCalculatorNotes) {
                  for (let j = 0; j < workspace.allCalculatorNotes.length; j++) {
                    if (workspace.allCalculatorNotes[j]?.id === child.noteId) {
                      workspace.allCalculatorNotes.splice(j, 1);
                      break;
                    }
                  }
                } else if (workspace.allPlainNotes) {
                  for (let j = 0; j < workspace.allPlainNotes.length; j++) {
                    if (workspace.allPlainNotes[j]?.id === child.noteId) {
                      workspace.allPlainNotes.splice(j, 1);
                      break;
                    }
                  }
                }
              }
            }

            // Remove folder from allFolders
            if (workspace.allFolders) {
              for (let i = 0; i < workspace.allFolders.length; i++) {
                if (workspace.allFolders[i]?.id === folderId) {
                  workspace.allFolders.splice(i, 1);
                  break;
                }
              }
            }
          };

          deleteFolder(id);
        } else {
          // Remove note from appropriate list
          const note = findNote(workspace, id);
          if (note?.flavour === "calculator" && workspace.allCalculatorNotes) {
            for (let i = 0; i < workspace.allCalculatorNotes.length; i++) {
              if (workspace.allCalculatorNotes[i]?.id === id) {
                workspace.allCalculatorNotes.splice(i, 1);
                break;
              }
            }
          } else if (workspace.allPlainNotes) {
            for (let i = 0; i < workspace.allPlainNotes.length; i++) {
              if (workspace.allPlainNotes[i]?.id === id) {
                workspace.allPlainNotes.splice(i, 1);
                break;
              }
            }
          }
        }

        // Clear selection if deleted item was selected
        if (selectedNoteId === id) {
          setSelectedNoteId(null);
        }
      }

      toast.success(ids.length === 1 ? "Deleted" : `Deleted ${ids.length} items`);
    },
    [workspace, rawTreeData, removeFolderItem, selectedNoteId]
  );

  // Handle note content updates
  const handleUpdateContent = useCallback(
    (content: Record<string, unknown>) => {
      if (!selectedNote) return;

      if (selectedNote.flavour === "calculator") {
        const calcNote = selectedNote as CalculatorNote;
        if (calcNote.content) {
          // For arrays, we need to replace elements one by one
          const newLines = (content.lines as string[]) ?? [""];
          // Clear existing lines
          while (calcNote.content.lines.length > 0) {
            calcNote.content.lines.pop();
          }
          // Add new lines
          for (const line of newLines) {
            calcNote.content.lines.push(line);
          }
        }
      } else {
        const plainNote = selectedNote as PlainNote;
        if (plainNote.content) {
          // Store TipTap JSON as serialized string in rawContent
          plainNote.content.rawContent = JSON.stringify(content.content ?? []);
        }
      }

      selectedNote.updatedAt = new Date();
    },
    [selectedNote]
  );

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen bg-background">
      <DragPreview />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Sidebar
        treeData={treeData}
        selectedId={selectedNoteId}
        onSelect={(node) => {
          if (node) {
            setSelectedNoteId(node.id);
            // Don't show editor for folders, but still track selection
          } else {
            setSelectedNoteId(null);
          }
        }}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onMove={handleMove}
        onRename={handleRename}
        onDelete={handleDelete}
        onOpenSettings={() => setSettingsOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        allTags={allTags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        tagCounts={tagCounts}
        treeRef={treeRef}
      />

      <main className="flex-1 p-4 md:p-6 md:ml-0 ml-12">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onUpdateTitle={(title) => {
              selectedNote.title = title;
              selectedNote.updatedAt = new Date();
            }}
            onUpdateContent={handleUpdateContent}
            onTogglePin={() => {
              selectedNote.isPinned = !selectedNote.isPinned;
              selectedNote.updatedAt = new Date();
            }}
            onAddTag={(tag) => {
              const currentTags = selectedNote.tags ?? [];
              selectedNote.tags = [...currentTags, tag];
              selectedNote.updatedAt = new Date();
            }}
            onRemoveTag={(index) => {
              const currentTags = selectedNote.tags ?? [];
              selectedNote.tags = currentTags.filter((_, i) => i !== index);
              selectedNote.updatedAt = new Date();
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Select a note or create a new one</p>
              <p className="text-sm mt-2">
                Use the sidebar to browse and organize your notes
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
