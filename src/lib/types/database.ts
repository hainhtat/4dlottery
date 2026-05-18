export type RoundStatus = "draft" | "open" | "closed" | "drawn";
export type TicketStatus = "active" | "voided";
export type PaymentType = "cash" | "credit";

export interface Profile {
  id: string;
  display_name: string;
  phone: string | null;
  commission_rate: number;
  credit_warning_threshold: number;
  is_active: boolean;
}

export interface Round {
  id: string;
  name: string;
  ticket_price: number;
  prize_amount: number;
  opens_at: string;
  closes_at: string;
  status: RoundStatus;
  winning_number: string | null;
  winner_ticket_id: string | null;
  created_at?: string;
}

export interface Ticket {
  id: string;
  public_id: string;
  round_id: string;
  agent_id: string;
  batch_id: string | null;
  number: string;
  buyer_name: string;
  buyer_contact: string;
  status: TicketStatus;
  verify_token: string;
  commission_amount: number;
  issued_at: string;
}
