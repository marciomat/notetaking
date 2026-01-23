"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle, Trash2, LogOut } from "lucide-react";
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
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { QRCodeScanner } from "@/components/ui/QRCodeScanner";
import { useJazzAuth } from "@/components/providers/JazzProvider";

interface JazzSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JazzSettingsDialog({
  open,
  onOpenChange,
}: JazzSettingsDialogProps) {
  const { passphrase, logInWithPassphrase, logOut } = useJazzAuth();
  const [copied, setCopied] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyPassphrase = async () => {
    if (!passphrase) return;

    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = passphrase;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRestore = async () => {
    if (!restorePassphrase.trim()) {
      setRestoreError("Please enter a recovery phrase");
      return;
    }

    // Validate passphrase format (12 or 24 words)
    const words = restorePassphrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setRestoreError("Recovery phrase should be 12 or 24 words.");
      return;
    }

    try {
      await logInWithPassphrase(restorePassphrase.trim());
      setRestoreError(null);
      setRestorePassphrase("");
      setShowRestoreConfirm(false);
      onOpenChange(false);
    } catch {
      setRestoreError("Failed to restore. Please check your recovery phrase.");
    }
  };

  const handleDeleteDatabase = async () => {
    setIsDeleting(true);
    try {
      // Clear localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("numpad") || key?.startsWith("jazz") || key?.startsWith("cojson")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Delete IndexedDB databases
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

      // Log out of Jazz
      logOut();

      // Force reload to return to setup screen
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete database:", error);
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
          {passphrase && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Your Recovery Phrase
              </label>
              <div className="rounded-md border border-border bg-muted p-3">
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {passphrase}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCopyPassphrase}
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
              <QRCodeDisplay value={passphrase} />
            </div>
          )}

          <Separator />

          {/* Restore from Passphrase */}
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
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter recovery phrase..."
                    value={restorePassphrase}
                    onChange={(e) => {
                      setRestorePassphrase(e.target.value);
                      setRestoreError(null);
                    }}
                    className="font-mono text-xs flex-1"
                  />
                  <QRCodeScanner
                    onScan={(value) => {
                      setRestorePassphrase(value);
                      setRestoreError(null);
                    }}
                    buttonLabel=""
                    buttonSize="icon"
                    className="shrink-0"
                  />
                </div>
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
                      setRestorePassphrase("");
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={logOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            </div>
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
