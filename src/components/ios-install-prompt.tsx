"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("ios-install-dismissed");

    if (isIOS && !isStandalone && !dismissed) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50">
      <CardContent className="p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => {
            localStorage.setItem("ios-install-dismissed", "true");
            setShowPrompt(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        <p className="pr-8 text-sm">
          Install this app: tap <strong>Share</strong> ⎋ then{" "}
          <strong>Add to Home Screen</strong> ➕
        </p>
      </CardContent>
    </Card>
  );
}
