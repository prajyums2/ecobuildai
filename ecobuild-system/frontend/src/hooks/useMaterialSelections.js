import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to get the latest material selections from localStorage.
 * Always returns the most recent selections, even if React state is stale.
 * Polls every 500ms to detect changes from other components.
 */
export function useMaterialSelections() {
  const [selections, setSelections] = useState({});
  const [lastUpdated, setLastUpdated] = useState(0);

  const loadSelections = useCallback(() => {
    try {
      const stored = localStorage.getItem('ecobuild-projects');
      if (stored) {
        const projects = JSON.parse(stored);
        const currentId = localStorage.getItem('ecobuild-current-project-id');
        const current = projects.find(p => p.id === currentId);
        if (current?.materialSelections) {
          const newSelections = current.materialSelections;
          // Only update if selections actually changed
          if (JSON.stringify(newSelections) !== JSON.stringify(selections)) {
            setSelections(newSelections);
            setLastUpdated(Date.now());
          }
        }
      }
    } catch (e) {
      console.error('[useMaterialSelections] Failed to load:', e);
    }
  }, [selections]);

  useEffect(() => {
    // Initial load
    loadSelections();
    
    // Poll every 500ms for changes from other components
    const interval = setInterval(loadSelections, 500);
    
    // Also listen for storage events (cross-tab sync)
    window.addEventListener('storage', loadSelections);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadSelections);
    };
  }, [loadSelections]);

  return { selections, lastUpdated };
}

/**
 * Hook to detect when material selections have changed.
 * Returns true if selections changed since last check.
 */
export function useMaterialSelectionsChanged() {
  const { selections, lastUpdated } = useMaterialSelections();
  const [hasChanged, setHasChanged] = useState(false);
  const [lastCheck, setLastCheck] = useState(0);

  useEffect(() => {
    if (lastUpdated > lastCheck && Object.keys(selections).length > 0) {
      setHasChanged(true);
      setLastCheck(lastUpdated);
    }
  }, [lastUpdated, selections, lastCheck]);

  const resetChanged = useCallback(() => {
    setHasChanged(false);
    setLastCheck(Date.now());
  }, []);

  return { hasChanged, resetChanged, selections, lastUpdated };
}

export default useMaterialSelections;
