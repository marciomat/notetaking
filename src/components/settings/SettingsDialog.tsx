"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import * as Evolu from "@evolu/common";
import { useEvolu } from "@/lib/evolu";
import type { AppOwner } from "@evolu/common";

const SETUP_COMPLETE_KEY = "numpad_setup_complete";
const ONBOARDING_COMPLETE_KEY = "numpad_onboarding_complete";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: AppOwner;
}

export function SettingsDialog({
  open,
  onOpenChange,
  owner,
}: SettingsDialogProps) {
  const evolu = useEvolu();
  const [copied, setCopied] = useState(false);
  const [restoreMnemonic, setRestoreMnemonic] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const mnemonic = owner.mnemonic ?? "";

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return;

    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = mnemonic;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRestore = async () => {
    if (!restoreMnemonic.trim()) {
      setRestoreError("Please enter a recovery phrase");
      return;
    }

    // Parse the mnemonic
    const parsedMnemonic = Evolu.Mnemonic.from(restoreMnemonic.trim());
    if (!parsedMnemonic.ok) {
      setRestoreError("Invalid recovery phrase format. Please check and try again.");
      return;
    }

    try {
      // restoreAppOwner will reload the page on success
      await evolu.restoreAppOwner(parsedMnemonic.value);
      // If we get here without a page reload, clear the form
      setRestoreError(null);
      setRestoreMnemonic("");
      setShowRestoreConfirm(false);
    } catch {
      setRestoreError("Failed to restore. Please check your recovery phrase.");
    }
  };

  const handleDeleteDatabase = async () => {
    setIsDeleting(true);
    try {
      // Clear localStorage flags so the setup dialog shows again
      localStorage.removeItem(SETUP_COMPLETE_KEY);
      localStorage.removeItem(ONBOARDING_COMPLETE_KEY);

      // Clear all localStorage (may contain other app state)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("numpad") || key?.startsWith("evolu")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Try to delete OPFS storage (where Evolu stores SQLite database)
      // OPFS directory is ".numpad" based on app name
      if (navigator.storage?.getDirectory) {
        try {
          const root = await navigator.storage.getDirectory();
          // Try to remove the Evolu OPFS directories
          const dirsToDelete = [".numpad", "numpad", ".evolu", "evolu"];
          for (const dirName of dirsToDelete) {
            try {
              await root.removeEntry(dirName, { recursive: true });
            } catch {
              // Directory may not exist, continue
            }
          }
        } catch (e) {
          console.log("OPFS cleanup skipped:", e);
        }
      }

      // Delete IndexedDB databases (Evolu may also use these)
      if ("databases" in indexedDB) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map((db) => {
              if (db.name) {
                return new Promise<void>((resolve) => {
                  const request = indexedDB.deleteDatabase(db.name!);
                  request.onsuccess = () => resolve();
                  request.onerror = () => resolve();
                  request.onblocked = () => resolve();
                });
              }
              return Promise.resolve();
            })
          );
        } catch {
          // Continue even if this fails
        }
      }

      // Fallback: try known database names (for Safari/Firefox)
      const knownDbNames = [
        "numpad",
        "evolu",
        "evolu-numpad",
        "evolu1",
        "/numpad",
        "/evolu",
      ];
      await Promise.all(
        knownDbNames.map(
          (name) =>
            new Promise<void>((resolve) => {
              try {
                const request = indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
              } catch {
                resolve();
              }
            })
        )
      );

      // Reset Evolu owner - this should clean up any remaining Evolu state
      await evolu.resetAppOwner();

      // Force reload to return to setup screen
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete database:", error);
      // Force reload anyway to try to recover
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your database and recovery options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Recovery Phrase */}
          {mnemonic && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Your Recovery Phrase
              </label>
              <div className="rounded-md border border-border bg-muted p-3">
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {mnemonic}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCopyMnemonic}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          )}

          <Separator />

          {/* Restore from Mnemonic */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Restore from Recovery Phrase
            </label>
            <p className="text-xs text-muted-foreground">
              Enter a recovery phrase to load a different database. This will
              replace your current local data.
            </p>

            {!showRestoreConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowRestoreConfirm(true)}
              >
                Restore from Phrase
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Enter recovery phrase..."
                  value={restoreMnemonic}
                  onChange={(e) => {
                    setRestoreMnemonic(e.target.value);
                    setRestoreError(null);
                  }}
                  className="font-mono text-xs"
                />
                {restoreError && (
                  <p className="text-xs text-destructive">{restoreError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setShowRestoreConfirm(false);
                      setRestoreMnemonic("");
                      setRestoreError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1" onClick={handleRestore}>
                    Restore
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </label>
            <p className="text-xs text-muted-foreground">
              Permanently delete all local data. Your notes will be removed from
              this device and the app will return to its initial setup screen.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Local Database
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Local Database?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This action will permanently delete all your notes, folders, and
                settings from this device.
              </span>
              <span className="block font-medium text-foreground">
                Make sure you have saved your recovery phrase if you want to
                restore your data later.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDatabase}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
