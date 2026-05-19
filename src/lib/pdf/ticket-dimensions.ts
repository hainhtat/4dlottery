/**
 * Portrait ticket canvas (~148mm wide @ 72dpi).
 * Height is content-fit (header + prize + number + details + QR footer), not full A6.
 * Invariant: exactly **one** print/PDF/PNG page per ticket — never split or stack
 * multiple tickets on one page. Batch PDFs use N pages for N tickets.
 */
export const TICKET_WIDTH_PX = 420;
/** Fits stacked layout in render-ticket-html with comfortable section gaps (5 detail rows). */
export const TICKET_HEIGHT_PX = 608;

/** Rendered QR on ticket; must fit inside {@link TICKET_HEIGHT_PX} with layout in render-ticket-html. */
export const TICKET_QR_DISPLAY_PX = 104;

/** Source bitmap for QR generation (≈3× display for sharp print). */
export const TICKET_QR_GENERATE_PX = 320;
