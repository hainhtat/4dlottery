# Agent PWA (Android / iOS)

Agents use the **same web app** installed to the home screen. No separate native app.

## Android (Chrome)

1. Deploy production web with HTTPS ([`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md)).
2. Agent opens **`https://your-domain.com/agent/sell`** (or logs in and lands on sell).
3. Chrome menu (⋮) → **Install app** or **Add to Home screen**.
4. Launch from the home screen icon — opens in standalone mode (no browser chrome).

An in-app banner on agent pages explains how to install:

- **Install app** button when Chrome fires `beforeinstallprompt` (common on Android).
- **Manual instructions** on desktop browser and iOS (menu / Share → Add to Home Screen).

Dismiss hides the banner for the **current browser tab session** only (not in the installed PWA). It shows again on the next login or when you open the site in a new tab/window.

## iPhone (Safari)

1. Open **`/agent/sell`** in Safari.
2. Tap **Share** → **Add to Home Screen**.
3. Confirm name and add.

iOS does not show the Android install banner; use Share manually.

## What works in the PWA

- Sell tickets, **verify tickets** (in-app QR scanner on the center tab), **save to gallery** (one PNG per ticket via share sheet), PDF download, sold tickets list, settlement, winners, live round updates
- In-app notifications on all agent pages when a round opens/closes, winning number is drawn, or you sold the winning ticket (Realtime refresh)
- Myanmar / English language switch
- Same login as browser (`/login` → agent role)

## Admin

Admins should use the **desktop browser** at `/admin` — not required as a PWA.

## Technical

- Manifest: [`public/manifest.webmanifest`](../public/manifest.webmanifest) (`scope: /agent`, `start_url: /agent/sell`)
- Agent layout metadata: [`src/app/agent/layout.tsx`](../src/app/agent/layout.tsx)
- Install UI: [`src/components/agent/AgentInstallPrompt.tsx`](../src/components/agent/AgentInstallPrompt.tsx)
- QR verify: [`src/app/agent/scan/page.tsx`](../src/app/agent/scan/page.tsx), floating tab bar [`AgentMobileBottomNav.tsx`](../src/components/agent/AgentMobileBottomNav.tsx)

## If you need a native app later

Revisit a separate React Native / Expo repo only if you need Play Store distribution, native push, or offline sell queues. Until then, PWA is the supported mobile path.
