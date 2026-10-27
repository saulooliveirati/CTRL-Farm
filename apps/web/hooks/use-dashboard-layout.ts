"use client";

import { useCallback, useEffect, useState } from "react";
import type { Layout } from "react-grid-layout";
import {
  type CardConfig,
  type CardId,
  type GridLayout,
  type GridLayouts,
  DEFAULT_CARDS_CONFIG,
  DEFAULT_LAYOUTS,
} from "@/types/dashboard-grid";

const STORAGE_KEY_PREFIX = "ctrlfarm_dashboard_layout_v2";

export function useDashboardLayout(userId: string = "default") {
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<GridLayouts>(DEFAULT_LAYOUTS);
  const [cardsConfig, setCardsConfig] = useState<Record<CardId, CardConfig>>(DEFAULT_CARDS_CONFIG);
  
  // Backups for "Cancelar" during edit mode
  const [savedLayouts, setSavedLayouts] = useState<GridLayouts>(DEFAULT_LAYOUTS);
  const [savedCardsConfig, setSavedCardsConfig] = useState<Record<CardId, CardConfig>>(DEFAULT_CARDS_CONFIG);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load layout from localStorage and API on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`;
    let loadedFromLocal = false;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.layouts && parsed.cardsConfig) {
          setLayouts(parsed.layouts);
          setCardsConfig(parsed.cardsConfig);
          setSavedLayouts(parsed.layouts);
          setSavedCardsConfig(parsed.cardsConfig);
          loadedFromLocal = true;
        }
      }
    } catch (e) {
      console.warn("Failed to read dashboard layout from localStorage", e);
    }

    // Attempt background sync from API
    fetch(`/api/dashboard/layout?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.layouts && data.cardsConfig) {
          if (!loadedFromLocal) {
            setLayouts(data.layouts);
            setCardsConfig(data.cardsConfig);
            setSavedLayouts(data.layouts);
            setSavedCardsConfig(data.cardsConfig);
          }
        }
      })
      .catch(() => {
        // Fallback to local is fine
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, [userId]);

  // Toggle card visibility
  const toggleCardVisibility = useCallback((cardId: CardId) => {
    setCardsConfig((prev) => {
      const current = prev[cardId];
      if (!current) return prev;
      const nextVisible = !current.visible;
      return {
        ...prev,
        [cardId]: {
          ...current,
          visible: nextVisible,
        },
      };
    });
  }, []);

  // Update card configuration
  const updateCardConfig = useCallback((cardId: CardId, partial: Partial<CardConfig>) => {
    setCardsConfig((prev) => {
      const current = prev[cardId];
      if (!current) return prev;
      return {
        ...prev,
        [cardId]: {
          ...current,
          ...partial,
          settings: {
            ...current.settings,
            ...partial.settings,
          },
        },
      };
    });
  }, []);

  // Reset to default layout and configs
  const resetToDefaultLayout = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    setCardsConfig(DEFAULT_CARDS_CONFIG);
  }, []);

  // Cancel edit mode and revert changes
  const cancelEdit = useCallback(() => {
    setLayouts(savedLayouts);
    setCardsConfig(savedCardsConfig);
    setIsEditing(false);
  }, [savedLayouts, savedCardsConfig]);

  // Save layout permanently to localStorage and API
  const saveLayout = useCallback(async () => {
    setIsSaving(true);
    const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`;
    const payload = {
      layouts,
      cardsConfig,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      }

      await fetch("/api/dashboard/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      }).catch(() => null);

      setSavedLayouts(layouts);
      setSavedCardsConfig(cardsConfig);
      setLastSavedAt(new Date());
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save layout", e);
    } finally {
      setIsSaving(false);
    }
  }, [userId, layouts, cardsConfig]);

  // Handle onLayoutChange from react-grid-layout
  const handleLayoutChange = useCallback((currentLayout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
    setLayouts(allLayouts as GridLayouts);
  }, []);

  return {
    isEditing,
    setIsEditing,
    layouts,
    setLayouts,
    cardsConfig,
    isLoaded,
    isSaving,
    lastSavedAt,
    handleLayoutChange,
    toggleCardVisibility,
    updateCardConfig,
    resetToDefaultLayout,
    cancelEdit,
    saveLayout,
  };
}
