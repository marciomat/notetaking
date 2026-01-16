"use client";

import dynamic from "next/dynamic";

// Dynamically import the app component with SSR disabled
// Evolu uses browser-only APIs (IndexedDB, WebWorker) that can't run on the server
const NotetakingApp = dynamic(
  () =>
    import("@/components/app/NotetakingApp").then((mod) => mod.NotetakingApp),
  { ssr: false },
);

export function ClientApp() {
  return <NotetakingApp />;
}
