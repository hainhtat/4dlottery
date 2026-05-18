import type { Locale } from "@/i18n";

export type TicketPdfData = {
  publicId: string;
  number: string;
  holderName: string | null;
  contact: string | null;
  roundName: string;
  prizeAmount: number;
  ticketPrice: number;
  drawDate: string;
  issuedAt: string;
  agentName: string;
  verifyUrl: string;
  qrDataUrl: string;
  locale?: Locale;
};
