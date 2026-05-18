"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const isFirstLoad = useRef(true);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      return result;
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : "Request failed";
      setError(message);
      throw e;
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    const silent = !isFirstLoad.current;
    isFirstLoad.current = false;
    refetch({ silent }).catch(() => {});
  }, [refetch]);

  return { data, setData, loading, error, refetch };
}
