"use client";

import { JazzProvider } from "jazz-react";
import { NumpadAccount } from "@/lib/schema";

const JAZZ_PEER = "wss://numpad_relay.mmdev.win" as `wss://${string}`;

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
