"use client";

import * as Evolu from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { Schema } from "./schema";

// Create the Evolu instance
// By not specifying transports, Evolu uses its default: wss://free.evoluhq.com
export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
  name: Evolu.SimpleName.orThrow("notetaking"),
});

// Create typed hook for accessing Evolu
export const useEvolu = createUseEvolu(evolu);

// Re-export provider
export { EvoluProvider };
export { evolu as db };
