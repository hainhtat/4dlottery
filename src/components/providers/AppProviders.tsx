"use client";

import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import { theme } from "@/lib/theme";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
