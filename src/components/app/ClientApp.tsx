"use client";

import dynamic from "next/dynamic";
import { JazzProvider } from "@/components/providers/JazzProvider";

// Dynamically import the app component with SSR disabled
// Jazz uses browser-only APIs (IndexedDB, WebSocket) that can't run on the server
const JazzNotetakingApp = dynamic(
  () =>
    import("@/components/app/JazzNotetakingApp").then((mod) => mod.JazzNotetakingApp),
  { ssr: false },
);

export function ClientApp() {
  return (
    <JazzProvider>
      <JazzNotetakingApp />
    </JazzProvider>
  );
}
