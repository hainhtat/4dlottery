export type DrawOutcome = "pending" | "winner" | "not_winner";
export type VerifyDisplayStatus = "valid" | "revoked" | "invalid" | "winner" | "not_winner";

export interface VerifyResult {
  valid: boolean;
  status: string;
  drawOutcome?: DrawOutcome;
  message?: string;
  roundStatus?: string;
  roundName?: string;
  number?: string;
  buyerNameMasked?: string;
  buyerContactMasked?: string;
  agentName?: string;
  issuedAt?: string;
  winningNumber?: string | null;
}

export const verifyStatusMeta: Record<
  VerifyDisplayStatus,
  { labelKey: string; accent: string; glow: string; subKey: string }
> = {
  valid: {
    labelKey: "verify.authentic",
    accent: "#4ade80",
    glow: "rgba(74, 222, 128, 0.35)",
    subKey: "verify.authenticSub",
  },
  winner: {
    labelKey: "verify.winner",
    accent: "#c9a227",
    glow: "rgba(201, 162, 39, 0.45)",
    subKey: "verify.winnerSub",
  },
  not_winner: {
    labelKey: "verify.notWinner",
    accent: "#94a3b8",
    glow: "rgba(148, 163, 184, 0.2)",
    subKey: "verify.notWinnerSub",
  },
  revoked: {
    labelKey: "verify.revoked",
    accent: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.3)",
    subKey: "verify.revokedSub",
  },
  invalid: {
    labelKey: "verify.invalid",
    accent: "#f87171",
    glow: "rgba(248, 113, 113, 0.3)",
    subKey: "verify.invalidSub",
  },
};

export function resolveVerifyDisplayStatus(result: VerifyResult): VerifyDisplayStatus {
  if (result.status === "invalid" || (!result.valid && result.status !== "revoked")) {
    return "invalid";
  }
  if (result.status === "revoked") return "revoked";
  if (result.drawOutcome === "winner") return "winner";
  if (result.drawOutcome === "not_winner") return "not_winner";
  return "valid";
}
