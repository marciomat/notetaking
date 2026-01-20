"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DatabaseTab {
  id: string;
  name: string;
  isSetupComplete: boolean;
  isOnboardingComplete: boolean;
  createdAt: number;
}

interface TabStore {
  tabs: DatabaseTab[];
  activeTabId: string | null;
  
  // Actions
  addTab: () => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  markTabSetupComplete: (id: string) => void;
  markTabOnboardingComplete: (id: string) => void;
  getActiveTab: () => DatabaseTab | null;
}

const generateTabId = () => `db_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createDefaultTab = (): DatabaseTab => ({
  id: "default",
  name: "Database 1",
  isSetupComplete: false,
  isOnboardingComplete: false,
  createdAt: Date.now(),
});

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [createDefaultTab()],
      activeTabId: "default",

      addTab: () => {
        const newId = generateTabId();
        const tabCount = get().tabs.length + 1;
        const newTab: DatabaseTab = {
          id: newId,
          name: `Database ${tabCount}`,
          isSetupComplete: false,
          isOnboardingComplete: false,
          createdAt: Date.now(),
        };
        
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newId,
        }));
        
        return newId;
      },

      removeTab: (id: string) => {
        const { tabs, activeTabId } = get();
        
        const newTabs = tabs.filter((t) => t.id !== id);
        
        // If removing the last tab, create a fresh default tab (reset to initial state)
        if (newTabs.length === 0) {
          const freshTab: DatabaseTab = {
            id: generateTabId(),
            name: "Database 1",
            isSetupComplete: false,
            isOnboardingComplete: false,
            createdAt: Date.now(),
          };
          set({
            tabs: [freshTab],
            activeTabId: freshTab.id,
          });
          return;
        }
        
        let newActiveId = activeTabId;
        
        // If we're removing the active tab, switch to another
        if (activeTabId === id) {
          const removedIndex = tabs.findIndex((t) => t.id === id);
          const newIndex = Math.min(removedIndex, newTabs.length - 1);
          newActiveId = newTabs[newIndex]?.id ?? newTabs[0]?.id ?? null;
        }
        
        set({
          tabs: newTabs,
          activeTabId: newActiveId,
        });
      },

      setActiveTab: (id: string) => {
        set({ activeTabId: id });
      },

      renameTab: (id: string, name: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        }));
      },

      markTabSetupComplete: (id: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, isSetupComplete: true } : t
          ),
        }));
      },

      markTabOnboardingComplete: (id: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, isOnboardingComplete: true } : t
          ),
        }));
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId) ?? null;
      },
    }),
    {
      name: "numpad-tabs-storage",
      version: 1,
    }
  )
);
