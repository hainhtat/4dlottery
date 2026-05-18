import { t, type Locale } from "@/i18n";

export function getPdfLabels(locale: Locale) {
  return {
    holder: t(locale, "pdf.holder"),
    contact: t(locale, "pdf.contact"),
    agent: t(locale, "pdf.agent"),
    drawDate: t(locale, "pdf.drawDate"),
    issued: t(locale, "pdf.issued"),
    grandPrize: t(locale, "pdf.grandPrize"),
    prizeSub: t(locale, "pdf.prizeSub"),
    ticketPrice: t(locale, "pdf.ticketPrice"),
    round: t(locale, "pdf.round"),
    yourNumber: t(locale, "pdf.yourNumber"),
    officialTicket: t(locale, "pdf.officialTicket"),
    scanVerify: t(locale, "pdf.verifyHint"),
    footer: t(locale, "pdf.footer"),
  };
}
