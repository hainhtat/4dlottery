type LogFields = Record<string, string | number | boolean | undefined>;

/** Structured server logs (host log drain / Sentry breadcrumbs). */
export function logInfo(event: string, fields?: LogFields) {
  console.log(JSON.stringify({ level: "info", event, ...fields, ts: new Date().toISOString() }));
}

export function logWarn(event: string, fields?: LogFields) {
  console.warn(JSON.stringify({ level: "warn", event, ...fields, ts: new Date().toISOString() }));
}

export function logError(event: string, error: unknown, fields?: LogFields) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      event,
      message,
      stack,
      ...fields,
      ts: new Date().toISOString(),
    })
  );
}

export function logPdfTiming(fields: {
  batchId: string;
  ticketCount: number;
  loadMs: number;
  renderMs: number;
  totalMs: number;
}) {
  logInfo("pdf.generated", fields);
}
