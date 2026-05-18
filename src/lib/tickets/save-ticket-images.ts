import { toast } from "react-toastify";
import { t, resolveLocale } from "@/i18n";
import { readLocaleStorage } from "@/i18n/locale-storage";

export type TicketImageRef = {
  id: string;
  number: string;
};

async function fetchTicketPngBlob(ticketId: string): Promise<Blob> {
  const res = await fetch(`/api/tickets/png/${ticketId}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.text();
    let message = "Could not generate ticket image";
    try {
      const json = JSON.parse(body) as { error?: string };
      message = json.error ?? message;
    } catch {
      message = body || message;
    }
    throw new Error(message);
  }
  return res.blob();
}

/** True on phones / tablets where share-to-gallery is useful. */
export function prefersTicketImages(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

/**
 * Save one PNG per ticket. Uses native share sheet on mobile (Save image / Photos),
 * otherwise downloads each file.
 */
export async function saveTicketImages(
  tickets: TicketImageRef[]
): Promise<"shared" | "downloaded"> {
  if (!tickets.length) {
    throw new Error("No tickets to save");
  }

  const files: File[] = [];
  for (const ticket of tickets) {
    const blob = await fetchTicketPngBlob(ticket.id);
    files.push(
      new File([blob], `ticket-${ticket.number}.png`, {
        type: "image/png",
      })
    );
  }

  if (typeof navigator.share === "function" && navigator.canShare?.({ files })) {
    await navigator.share({
      files,
      title: "Lottery tickets",
    });
    return "shared";
  }

  for (const file of files) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    await new Promise((r) => setTimeout(r, 400));
  }

  return "downloaded";
}

export async function saveTicketImagesWithToast(tickets: TicketImageRef[]): Promise<boolean> {
  const locale = resolveLocale(readLocaleStorage());
  try {
    const mode = await saveTicketImages(tickets);
    if (mode === "shared") {
      toast.success(t(locale, "agent.tickets.saveImagesShareHint"));
    } else {
      toast.success(t(locale, "agent.tickets.saveImagesDownloaded"));
    }
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t(locale, "errors.pdfFailed"));
    return false;
  }
}
