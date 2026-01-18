"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  description?: string;
}

export function QRCodeDisplay({
  value,
  title = "Recovery Phrase QR Code",
  description = "Scan this QR code with another device to transfer your recovery phrase",
}: QRCodeDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setIsOpen(true)}
      >
        <QrCode className="mr-2 h-4 w-4" />
        Show QR Code
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4">
            <div className="rounded-lg bg-white p-4">
              <QRCodeSVG
                value={value}
                size={256}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground text-center max-w-xs">
              This QR code is generated locally and is not stored or sent anywhere.
              Close this dialog when done.
            </p>
          </div>

          <Button variant="outline" onClick={() => setIsOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
