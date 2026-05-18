"use client";

import { create } from "zustand";

type PortalState = {
  sidebarOpen: boolean;
  notificationOpen: boolean;
  darkMode: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNotificationOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
};

export const usePortalStore = create<PortalState>((set) => ({
  sidebarOpen: false,
  notificationOpen: false,
  darkMode:
    typeof window !== "undefined" &&
    window.localStorage.getItem("atomquest-theme") === "dark",
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setNotificationOpen: (notificationOpen) => set({ notificationOpen }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));
