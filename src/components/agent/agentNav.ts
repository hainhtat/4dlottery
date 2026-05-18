"use client";

import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import type { NavItem } from "@/components/layout/DashboardShell";

export const AGENT_PROFILE_HREF = "/agent/profile";
export const AGENT_SCAN_HREF = "/agent/scan";

export const AGENT_NAV: NavItem[] = [
  { labelKey: "nav.agent.sell", href: "/agent/sell", icon: PointOfSaleRoundedIcon },
  { labelKey: "nav.agent.summary", href: "/agent/summary", icon: AccountBalanceRoundedIcon },
  { labelKey: "nav.agent.tickets", href: "/agent/tickets", icon: ConfirmationNumberRoundedIcon },
  { labelKey: "nav.agent.winners", href: "/agent/winners", icon: EmojiEventsRoundedIcon },
];

/** Left pair on mobile floating tab bar */
export const AGENT_MOBILE_NAV_LEFT: NavItem[] = [
  { labelKey: "nav.agent.sell", href: "/agent/sell", icon: PointOfSaleRoundedIcon },
  { labelKey: "nav.agent.summary", href: "/agent/summary", icon: AccountBalanceRoundedIcon },
];

/** Right pair on mobile floating tab bar */
export const AGENT_MOBILE_NAV_RIGHT: NavItem[] = [
  { labelKey: "nav.agent.tickets", href: "/agent/tickets", icon: ConfirmationNumberRoundedIcon },
  { labelKey: "nav.agent.winners", href: "/agent/winners", icon: EmojiEventsRoundedIcon },
];

export const AGENT_SCAN_NAV_ITEM: NavItem = {
  labelKey: "nav.agent.scan",
  href: AGENT_SCAN_HREF,
  icon: QrCodeScannerRoundedIcon,
};

export const AGENT_PROFILE_NAV_ITEM: NavItem = {
  labelKey: "nav.agent.profile",
  href: AGENT_PROFILE_HREF,
  icon: PersonRoundedIcon,
};

export const AGENT_SIDEBAR_NAV: NavItem[] = [
  AGENT_MOBILE_NAV_LEFT[0],
  AGENT_MOBILE_NAV_LEFT[1],
  AGENT_SCAN_NAV_ITEM,
  ...AGENT_MOBILE_NAV_RIGHT,
  AGENT_PROFILE_NAV_ITEM,
];
