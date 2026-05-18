"use client";

import { useEffect, useState } from "react";
import Box from "@mui/joy/Box";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemButton from "@mui/joy/ListItemButton";
import ListItemDecorator from "@mui/joy/ListItemDecorator";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AGENT_PROFILE_HREF } from "@/components/agent/agentNav";
import { useT } from "@/components/providers/LocaleProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function AgentMobileAccountMenu({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const t = useT();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const pathname = usePathname() ?? "";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setEmail(user.email ?? null);
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setDisplayName(profile?.display_name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const seed = userId ?? email ?? "agent";

  return (
    <>
      <Box
        sx={{
          px: 2,
          py: 3,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <UserAvatar seed={seed} size="lg" />
        <Typography level="title-lg" sx={{ color: "common.white", mt: 1.5 }}>
          {displayName ?? t("common.agent")}
        </Typography>
        {email && (
          <Typography level="body-sm" sx={{ color: "neutral.400", mt: 0.25 }}>
            {email}
          </Typography>
        )}
      </Box>
      <Box sx={{ px: 2, py: 1.5 }}>
        <LanguageSwitcher />
      </Box>
      <List sx={{ flex: 1, px: 1, py: 1, "--ListItem-radius": "8px" }}>
        <ListItem>
          <ListItemButton
            component={Link}
            href={AGENT_PROFILE_HREF}
            selected={pathname === AGENT_PROFILE_HREF}
            onClick={onNavigate}
            sx={{
              color: "neutral.200",
              fontWeight: 500,
            }}
          >
            <ListItemDecorator sx={{ color: "inherit", minWidth: 28 }}>
              <PersonRoundedIcon fontSize="small" />
            </ListItemDecorator>
            {t("account.profilePassword")}
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Button
          variant="soft"
          color="neutral"
          fullWidth
          startDecorator={<LogoutRoundedIcon />}
          onClick={onLogout}
          sx={{ color: "neutral.200" }}
        >
          {t("common.signOut")}
        </Button>
      </Box>
    </>
  );
}
