"use client";

import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import CircularProgress from "@mui/joy/CircularProgress";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";

export function DataTable({
  loading,
  emptyMessage = "No data yet",
  children,
}: {
  loading?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <Sheet variant="outlined" sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Sheet>
    );
  }

  return (
    <Sheet
      variant="outlined"
      sx={{
        borderRadius: "lg",
        overflow: "auto",
        "& table": { minWidth: 640 },
        "& thead th": {
          bgcolor: "background.level1",
          fontWeight: 600,
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        },
        "& tbody tr:hover": { bgcolor: "background.level1" },
      }}
    >
      {children}
    </Sheet>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            {message}
          </Typography>
        </Box>
      </td>
    </tr>
  );
}
