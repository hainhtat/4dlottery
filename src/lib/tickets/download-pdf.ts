import { toast } from "react-toastify";
import { t, resolveLocale } from "@/i18n";
import { readLocaleStorage } from "@/i18n/locale-storage";

export async function downloadTicketPdf(batchId: string): Promise<boolean> {
  const res = await fetch(`/api/tickets/pdf/${batchId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.text();
    let message = "Could not generate PDF";
    try {
      const json = JSON.parse(body) as { error?: string };
      message = json.error ?? message;
    } catch {
      message = body || message;
    }
    const locale = resolveLocale(readLocaleStorage());
    toast.error(message || t(locale, "errors.pdfFailed"));
    return false;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tickets-${batchId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
