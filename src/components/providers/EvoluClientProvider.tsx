"use client";

import { EvoluProvider, evolu } from "@/lib/evolu";

interface EvoluClientProviderProps {
  children: React.ReactNode;
}

export function EvoluClientProvider({ children }: EvoluClientProviderProps) {
  return <EvoluProvider value={evolu}>{children}</EvoluProvider>;
}
