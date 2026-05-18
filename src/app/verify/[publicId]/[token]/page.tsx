import { Suspense } from "react";
import { VerifyTicketView } from "@/components/verify/VerifyTicketView";
import { VerifyTicketFallback } from "@/components/verify/VerifyTicketFallback";

export const dynamic = "force-dynamic";

export default function VerifyWithTokenPage() {
  return (
    <Suspense fallback={<VerifyTicketFallback />}>
      <VerifyTicketView />
    </Suspense>
  );
}
