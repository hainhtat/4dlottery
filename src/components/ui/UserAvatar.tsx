"use client";

import Avatar from "@mui/joy/Avatar";
import { avatarUrl } from "@/lib/avatar";

export function UserAvatar({
  seed,
  size = "md",
  alt = "Profile",
}: {
  seed: string;
  size?: "sm" | "md" | "lg";
  alt?: string;
}) {
  const px = size === "sm" ? 32 : size === "lg" ? 96 : 40;
  return (
    <Avatar
      size={size}
      alt={alt}
      src={avatarUrl(seed, px * 2)}
      sx={{ bgcolor: "primary.100" }}
    />
  );
}
