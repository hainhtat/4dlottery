"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AgentRefreshContextValue = {
  refreshKey: number;
  notifyAgentDataChanged: () => void;
};

const AgentRefreshContext = createContext<AgentRefreshContextValue | null>(null);

export function AgentRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const notifyAgentDataChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({ refreshKey, notifyAgentDataChanged }),
    [refreshKey, notifyAgentDataChanged]
  );

  return (
    <AgentRefreshContext.Provider value={value}>{children}</AgentRefreshContext.Provider>
  );
}

export function useAgentRefresh() {
  const ctx = useContext(AgentRefreshContext);
  if (!ctx) {
    return {
      refreshKey: 0,
      notifyAgentDataChanged: () => {},
    };
  }
  return ctx;
}
