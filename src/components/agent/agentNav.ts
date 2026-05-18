"use client";

import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import type { NavItem } from "@/components/layout/DashboardShell";

export const AGENT_PROFILE_HREF = "/agent/profile";

export const AGENT_NAV: NavItem[] = [
  { labelKey: "nav.agent.sell", href: "/agent/sell", icon: PointOfSaleRoundedIcon },
  { labelKey: "nav.agent.summary", href: "/agent/summary", icon: AccountBalanceRoundedIcon },
  { labelKey: "nav.agent.tickets", href: "/agent/tickets", icon: ConfirmationNumberRoundedIcon },
  { labelKey: "nav.agent.winners", href: "/agent/winners", icon: EmojiEventsRoundedIcon },
];

export const AGENT_PROFILE_NAV_ITEM: NavItem = {
  labelKey: "nav.agent.profile",
  href: AGENT_PROFILE_HREF,
  icon: PersonRoundedIcon,
};

export const AGENT_SIDEBAR_NAV: NavItem[] = [...AGENT_NAV, AGENT_PROFILE_NAV_ITEM];
