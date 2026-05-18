"use client";

import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={2}
      sx={{ mb: { xs: 2, md: 3 } }}
    >
      <Box>
        <Typography level="h2" sx={{ fontWeight: 700, fontSize: { xs: "1.35rem", md: undefined } }}>
          {title}
        </Typography>
        {description && (
          <Typography level="body-md" sx={{ color: "text.tertiary", mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
