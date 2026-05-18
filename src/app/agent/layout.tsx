export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { AgentPortalShell } from "@/components/agent/AgentPortalShell";

export const metadata: Metadata = {
  title: "Premium Lottery Agent",
  description: "Sell tickets and view settlement",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lottery",
  },
  applicationName: "Premium Lottery",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#c9a227",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <AgentPortalShell>{children}</AgentPortalShell>;
}
