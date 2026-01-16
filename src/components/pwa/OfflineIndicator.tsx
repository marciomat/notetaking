"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useServiceWorker } from "@/lib/hooks/useServiceWorker";

export function OfflineIndicator() {
  const { isOffline, needsUpdate, updateServiceWorker } = useServiceWorker();

  if (!isOffline && !needsUpdate) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span>You&apos;re offline</span>
        </div>
      )}

      {needsUpdate && (
        <button
          onClick={updateServiceWorker}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-600"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Update available - Click to refresh</span>
        </button>
      )}
    </div>
  );
}
