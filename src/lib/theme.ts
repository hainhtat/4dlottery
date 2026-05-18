import { extendTheme } from "@mui/joy/styles";

export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: "#fdf8eb",
          100: "#f9edd0",
          200: "#f0d9a0",
          300: "#e4c06a",
          400: "#d4a84a",
          500: "#c9a227",
          600: "#a8841f",
          700: "#876619",
          800: "#6b5018",
          900: "#584316",
        },
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        background: {
          body: "#f4f6f9",
          surface: "#ffffff",
          level1: "#f8fafc",
          level2: "#f1f5f9",
        },
      },
    },
  },
  fontFamily: {
    body: 'var(--font-noto-myanmar), var(--font-geist-sans), system-ui, sans-serif',
    display: 'var(--font-noto-myanmar), var(--font-geist-sans), system-ui, sans-serif',
  },
  radius: {
    xs: "4px",
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "18px",
  },
  shadow: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    md: "0 4px 12px rgba(15, 23, 42, 0.08)",
    lg: "0 8px 24px rgba(15, 23, 42, 0.1)",
  },
});
