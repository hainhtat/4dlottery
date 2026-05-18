"use client";

import * as React from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import { theme } from "@/lib/theme";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Joy UI + App Router: Emotion styles must flush on the server via
 * useServerInsertedHTML so SSR markup matches the client (avoids hydration errors).
 * @see https://mui.com/joy-ui/integrations/next-js-app-router/
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const cache = createCache({ key: "joy" });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (serialized !== undefined && cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <CssVarsProvider theme={theme} defaultMode="light">
        <CssBaseline />
        <LocaleProvider>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={4000}
            theme="colored"
            limit={3}
            newestOnTop
          />
        </LocaleProvider>
      </CssVarsProvider>
    </CacheProvider>
  );
}
