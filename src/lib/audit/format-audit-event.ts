import type { TranslateVars } from "@/i18n";

export interface AuditEventRow {
  entity_type: string;
  entity_id: string;
  action: string;
  payload: unknown;
}

export interface AuditLookup {
  roundName: (id: string | undefined) => string | null;
  agentName: (id: string | undefined) => string | null;
}

type TFn = (key: string, vars?: TranslateVars) => string;

function shortId(id: string): string {
  return id.slice(0, 8);
}

function payloadRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function entityTypeKey(entityType: string): string {
  const known = ["ticket_batch", "ticket", "round", "profile"];
  return known.includes(entityType) ? entityType : "unknown";
}

export function formatAuditEntity(
  event: Pick<AuditEventRow, "entity_type" | "entity_id">,
  lookup: AuditLookup,
  t: TFn
): string {
  const typeLabel = t(`admin.audit.entity.${entityTypeKey(event.entity_type)}`);
  const id = event.entity_id;

  if (event.entity_type === "round") {
    const name = lookup.roundName(id);
    if (name) return t("admin.audit.entityNamed", { type: typeLabel, name });
  }

  if (event.entity_type === "profile") {
    const name = lookup.agentName(id);
    if (name) return t("admin.audit.entityNamed", { type: typeLabel, name });
  }

  return t("admin.audit.entityShortId", { type: typeLabel, id: shortId(id) });
}

export function formatAuditAction(action: string, t: TFn): string {
  const key = `admin.audit.action.${action}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatAuditDetails(
  event: AuditEventRow,
  lookup: AuditLookup,
  t: TFn
): string {
  const p = payloadRecord(event.payload);

  switch (event.action) {
    case "issued": {
      const count = Number(p.count ?? 0);
      const numbers = Array.isArray(p.numbers)
        ? (p.numbers as unknown[]).map(String).join(", ")
        : "";
      const round =
        lookup.roundName(String(p.round_id ?? "")) ??
        (p.round_id ? shortId(String(p.round_id)) : "—");
      return t("admin.audit.detail.issued", { count, numbers, round });
    }
    case "voided":
      return t("admin.audit.detail.voided", {
        reason: String(p.reason ?? "—"),
      });
    case "drawn_with_winner":
      return t("admin.audit.detail.drawnWithWinner", {
        number: String(p.winning_number ?? "—"),
        agent:
          lookup.agentName(String(p.agent_id ?? "")) ??
          (p.agent_id ? shortId(String(p.agent_id)) : "—"),
      });
    case "drawn_no_winner":
      return t("admin.audit.detail.drawnNoWinner", {
        number: String(p.winning_number ?? "—"),
      });
    case "agent_created":
      return t("admin.audit.detail.agentCreated", {
        name: String(p.displayName ?? "—"),
        email: String(p.email ?? "—"),
      });
    case "agent_updated": {
      const parts: string[] = [];
      if (p.displayName !== undefined) parts.push(String(p.displayName));
      if (p.phone !== undefined) parts.push(String(p.phone ?? "—"));
      if (p.commission_rate !== undefined) parts.push(`${p.commission_rate}%`);
      if (p.is_active !== undefined) {
        parts.push(p.is_active ? t("admin.agents.statusActive") : t("admin.agents.statusInactive"));
      }
      return parts.length
        ? t("admin.audit.detail.agentUpdated", { changes: parts.join(" · ") })
        : t("admin.audit.detail.generic");
    }
    case "agent_password_reset":
      return t("admin.audit.detail.agentPasswordReset", {
        email: String(p.email ?? "—"),
      });
    default:
      if (Object.keys(p).length === 0) return t("admin.audit.detail.generic");
      return Object.entries(p)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .join(" · ");
  }
}
