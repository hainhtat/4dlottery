import { DashboardShell } from "@/components/layout/DashboardShell";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

const nav = [
  { labelKey: "nav.admin.dashboard", href: "/admin/dashboard", icon: DashboardRoundedIcon },
  { labelKey: "nav.admin.rounds", href: "/admin/rounds", icon: EventRoundedIcon },
  { labelKey: "nav.admin.agents", href: "/admin/agents", icon: PeopleRoundedIcon },
  { labelKey: "nav.admin.tickets", href: "/admin/tickets", icon: ConfirmationNumberRoundedIcon },
  { labelKey: "nav.admin.audit", href: "/admin/audit", icon: HistoryRoundedIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell portalLabelKey="common.admin" nav={nav}>
      {children}
    </DashboardShell>
  );
}
