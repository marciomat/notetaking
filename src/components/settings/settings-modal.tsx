"use client";

import { useState } from "react";
import { useAccount } from "jazz-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SeedShareModal } from "@/components/auth/seed-share-modal";
import { Smartphone, LogOut, User } from "lucide-react";
import { toast } from "sonner";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { me, logOut } = useAccount();
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out? Make sure you have saved your passphrase!")) {
      logOut();
      toast.success("Logged out successfully");
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your account and sync settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Account Info */}
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {me?.profile?.name || "Anonymous"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {me?.id || "No account ID"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Sync to Device */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setSyncModalOpen(true)}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Sync to Another Device
            </Button>

            <Separator />

            {/* Logout */}
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Make sure you have saved your passphrase before logging out.
              You will need it to restore your account.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <SeedShareModal open={syncModalOpen} onOpenChange={setSyncModalOpen} />
    </>
  );
}
