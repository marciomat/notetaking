"use client";

import { JazzProvider } from "jazz-react";
import { NumpadAccount } from "@/lib/schema";

const JAZZ_PEER = process.env.NEXT_PUBLIC_JAZZ_PEER || "wss://cloud.jazz.tools/?key=numpad@example.com";

export function NumpadJazzProvider({ children }: { children: React.ReactNode }) {
  return (
    <JazzProvider
      AccountSchema={NumpadAccount}
      sync={{ peer: JAZZ_PEER }}
    >
      {children}
    </JazzProvider>
  );
}
