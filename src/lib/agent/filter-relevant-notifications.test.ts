import { describe, expect, it } from "vitest";
import {
  filterRelevantNotifications,
  getRelevantRoundIds,
} from "@/lib/agent/filter-relevant-notifications";
import type { AgentNotificationRow } from "@/lib/agent/notification-types";

const n = (
  id: string,
  roundId: string,
  type: AgentNotificationRow["type"]
): AgentNotificationRow => ({
  id,
  roundId,
  type,
  payload: { round_name: roundId },
  message: null,
});

describe("getRelevantRoundIds", () => {
  it("returns open rounds during active sales", () => {
    const ids = getRelevantRoundIds([
      { id: "r1", status: "drawn", created_at: "2024-01-01" },
      { id: "r2", status: "open", created_at: "2024-02-01" },
    ]);
    expect([...ids]).toEqual(["r2"]);
  });

  it("returns focus round when nothing is open", () => {
    const ids = getRelevantRoundIds([
      { id: "r1", status: "drawn", created_at: "2024-01-01" },
      { id: "r2", status: "closed", created_at: "2024-02-01" },
    ]);
    expect([...ids]).toEqual(["r2"]);
  });
});

describe("filterRelevantNotifications", () => {
  it("hides prior-cycle alerts while a new round is open", () => {
    const rows = filterRelevantNotifications(
      [n("a", "r1", "round_drawn"), n("b", "r2", "round_open")],
      [
        { id: "r1", status: "drawn", created_at: "2024-01-01" },
        { id: "r2", status: "open", created_at: "2024-02-01" },
      ]
    );
    expect(rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("shows close/draw alerts for the current transition round", () => {
    const rows = filterRelevantNotifications(
      [n("a", "r2", "round_closed"), n("b", "r1", "round_drawn")],
      [
        { id: "r1", status: "drawn", created_at: "2024-01-01" },
        { id: "r2", status: "closed", created_at: "2024-02-01" },
      ]
    );
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });
});
