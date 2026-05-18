"use client";

import { useEffect, useState } from "react";
import Box from "@mui/joy/Box";
import Sheet from "@mui/joy/Sheet";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import ListItemButton from "@mui/joy/ListItemButton";
import ListItemDecorator from "@mui/joy/ListItemDecorator";
import Typography from "@mui/joy/Typography";
import IconButton from "@mui/joy/IconButton";
import Button from "@mui/joy/Button";
import Drawer from "@mui/joy/Drawer";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/components/providers/LocaleProvider";

export interface NavItem {
  labelKey: string;
  href: string;
  icon: SvgIconComponent;
}

function SidebarContent({
  portalLabelKey,
  nav,
  pathname,
  profileHref,
  onNavigate,
  onLogout,
}: {
  portalLabelKey: string;
  nav: NavItem[];
  pathname: string;
  profileHref?: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const t = useT();

  return (
    <>
      <Box sx={{ px: 2, py: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography
          level="title-md"
          sx={{
            color: "primary.400",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontSize: "0.7rem",
          }}
        >
          {t("app.brand")}
        </Typography>
        <Typography level="h4" sx={{ color: "common.white", mt: 0.5 }}>
          {t(portalLabelKey)}
        </Typography>
      </Box>
      <List sx={{ flex: 1, px: 1, py: 2, "--ListItem-radius": "8px" }}>
        {nav.map((item) => {
          const selected =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <ListItem key={item.href}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={selected}
                onClick={onNavigate}
                sx={{
                  color: selected ? "primary.400" : "neutral.300",
                  fontWeight: selected ? 600 : 400,
                  "&.Joy-selected": {
                    bgcolor: "rgba(201, 162, 39, 0.12)",
                  },
                }}
              >
                <ListItemDecorator sx={{ color: "inherit", minWidth: 28 }}>
                  <Icon fontSize="small" />
                </ListItemDecorator>
                {t(item.labelKey)}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography level="body-xs" sx={{ color: "neutral.500", mb: 0.5, px: 0.5 }}>
            {t("common.language")}
          </Typography>
          <LanguageSwitcher />
        </Box>
        {profileHref && !nav.some((n) => n.href === profileHref) && (
          <ListItem sx={{ px: 0, mb: 1 }}>
            <ListItemButton
              component={Link}
              href={profileHref}
              selected={pathname === profileHref}
              onClick={onNavigate}
              sx={{
                color: pathname === profileHref ? "primary.400" : "neutral.300",
                fontWeight: pathname === profileHref ? 600 : 400,
              }}
            >
              <ListItemDecorator sx={{ color: "inherit", minWidth: 28 }}>
                <PersonRoundedIcon fontSize="small" />
              </ListItemDecorator>
              {t("common.profile")}
            </ListItemButton>
          </ListItem>
        )}
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

export function DashboardShell({
  portalLabelKey,
  nav,
  children,
  mobileBottomNav,
  profileHref,
  sidebarFromSm = false,
  renderMobileAccountDrawer,
}: {
  portalLabelKey: string;
  nav: NavItem[];
  children: React.ReactNode;
  mobileBottomNav?: React.ReactNode;
  profileHref?: string;
  sidebarFromSm?: boolean;
  renderMobileAccountDrawer?: (props: {
    onNavigate: () => void;
    onLogout: () => void;
  }) => React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState("user");
  const supabase = createClient();

  const useAccountDrawer = Boolean(mobileBottomNav && renderMobileAccountDrawer);

  useEffect(() => {
    if (!useAccountDrawer) return;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAvatarSeed(user.id);
    });
  }, [supabase, useAccountDrawer]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const closeMobile = () => setMobileOpen(false);

  const sidebarProps = {
    portalLabelKey,
    nav,
    pathname,
    profileHref,
    onLogout: handleLogout,
  };

  const sidebarWidth = 260;
  const showSidebar = sidebarFromSm
    ? { xs: "none" as const, sm: "flex" as const }
    : { xs: "none" as const, md: "flex" as const };
  const hideCompactChrome = sidebarFromSm
    ? { xs: "flex" as const, sm: "none" as const }
    : { xs: "flex" as const, md: "none" as const };
  const contentMargin = sidebarFromSm
    ? { sm: `${sidebarWidth}px` }
    : { md: `${sidebarWidth}px` };
  const mainPadding = sidebarFromSm
    ? { xs: 2, sm: 3 }
    : { xs: 2, md: 3 };
  const mainPaddingBottom = sidebarFromSm
    ? {
        xs: mobileBottomNav ? "calc(80px + var(--safe-bottom))" : 2,
        sm: 3,
      }
    : {
        xs: mobileBottomNav ? "calc(80px + var(--safe-bottom))" : 2,
        md: 3,
      };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.body" }}>
      <Sheet
        sx={{
          width: sidebarWidth,
          display: showSidebar,
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          height: "100dvh",
          zIndex: 1200,
          overflowY: "auto",
          bgcolor: "neutral.900",
          borderRight: "none",
        }}
      >
        <SidebarContent {...sidebarProps} />
      </Sheet>

      <Drawer
        open={mobileOpen}
        onClose={closeMobile}
        sx={{ display: hideCompactChrome }}
      >
        <Sheet
          sx={{
            width: 260,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            bgcolor: "neutral.900",
            pt: "var(--safe-top)",
          }}
        >
          {useAccountDrawer && renderMobileAccountDrawer ? (
            renderMobileAccountDrawer({ onNavigate: closeMobile, onLogout: handleLogout })
          ) : (
            <SidebarContent {...sidebarProps} onNavigate={closeMobile} />
          )}
        </Sheet>
      </Drawer>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: "100dvh",
          ml: contentMargin,
        }}
      >
        <Sheet
          sx={{
            display: hideCompactChrome,
            position: "sticky",
            top: 0,
            zIndex: 1100,
            alignItems: "center",
            gap: 1.5,
            px: { xs: "calc(16px + var(--safe-left))", sm: 2 },
            pr: { xs: "calc(16px + var(--safe-right))", sm: 2 },
            pt: { xs: "calc(12px + var(--safe-top))", sm: 1.5 },
            pb: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.surface",
          }}
        >
          {useAccountDrawer ? (
            <IconButton
              variant="soft"
              color="neutral"
              aria-label={t("account.menu")}
              onClick={() => setMobileOpen(true)}
              sx={{ p: 0.25 }}
            >
              <UserAvatar seed={avatarSeed} size="sm" />
            </IconButton>
          ) : (
            <IconButton
              variant="outlined"
              color="neutral"
              aria-label={t("account.openMenu")}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography level="title-md" sx={{ flex: 1 }}>
            {t(portalLabelKey)}
          </Typography>
          <LanguageSwitcher compact />
        </Sheet>
        <Box
          component="main"
          sx={{
            flex: 1,
            p: mainPadding,
            pb: mainPaddingBottom,
            overflow: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
      {mobileBottomNav}
    </Box>
  );
}
