"use client";

import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Link from "@mui/joy/Link";
import Stack from "@mui/joy/Stack";

export function PageContainer({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", width: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Breadcrumbs size="sm" sx={{ mb: 0.5 }}>
            <Link color="neutral">Premium Lottery</Link>
            <Typography>{title}</Typography>
          </Breadcrumbs>
          <Typography level="h2">{title}</Typography>
          {description && (
            <Typography level="body-md" sx={{ color: "text.secondary", mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
  );
}
