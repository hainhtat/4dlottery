"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: string }).message);
  }
  return "Request failed";
}

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

  const depsKey = useMemo(
    () => JSON.stringify(Array.isArray(deps) ? deps : []),
    [deps]
  );

  const run = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      return result;
    } catch (e) {
      const message = toErrorMessage(e);
      setError(message);
      throw e;
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const silent = !isFirstLoad.current;
    isFirstLoad.current = false;
    run({ silent }).catch(() => {});
  }, [depsKey, run]);

  const refetch = useCallback(
    (options?: { silent?: boolean }) => run(options),
    [run]
  );

  return { data, setData, loading, error, refetch };
}
