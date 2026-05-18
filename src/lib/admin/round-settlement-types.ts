export interface AdminSettlementRound {
  id: string;
  name: string;
  status: string;
  ticket_price: number;
  prize_amount: number;
  closes_at: string;
  winning_number?: string | null;
  has_winner?: boolean;
  winner_agent_id?: string | null;
  winner_agent_name?: string | null;
  winner_ticket_number?: string | null;
  winner_buyer_name?: string | null;
  winner_buyer_contact?: string | null;
}

export interface AdminSettlementAgent {
  agent_id: string;
  display_name: string;
  commission_rate: number;
  tickets_sold: number;
  gross_sales: number;
  total_commission: number;
  amount_due: number;
  is_winner_agent?: boolean;
  prize_to_pay?: number;
}

export interface AdminSettlementTotals {
  tickets_sold: number;
  gross_sales: number;
  total_commission: number;
  amount_due: number;
  prize_payout?: number;
  net_collect?: number;
}

export interface AdminRoundSettlementPayload {
  round: AdminSettlementRound | null;
  agents: AdminSettlementAgent[];
  totals: AdminSettlementTotals | null;
}
