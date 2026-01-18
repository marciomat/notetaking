"use client";

import * as Evolu from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { Schema } from "./schema";

// Create the Evolu instance with sync enabled via multiple relays for redundancy
export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
  name: Evolu.SimpleName.orThrow("numpad"),
  transports: [
    { type: "WebSocket", url: "wss://free.evoluhq.com" },
    { type: "WebSocket", url: "wss://evolu-relay.marcio-mat.workers.dev" },
  ],
});

// Create typed hook for accessing Evolu
export const useEvolu = createUseEvolu(evolu);

// Re-export provider
export { EvoluProvider };
export { evolu as db };
