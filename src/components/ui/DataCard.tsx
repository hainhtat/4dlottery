"use client";

import Card from "@mui/joy/Card";
import CircularProgress from "@mui/joy/CircularProgress";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";

export function DataCard({
  children,
  loading,
  empty,
  emptyMessage = "No data yet",
}: {
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <Card variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size="md" />
        </Stack>
      ) : empty ? (
        <Typography level="body-md" sx={{ py: 4, textAlign: "center", color: "text.tertiary" }}>
          {emptyMessage}
        </Typography>
      ) : (
        children
      )}
    </Card>
  );
}
