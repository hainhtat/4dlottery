/** Explicit FK hints — tickets↔rounds has two relationships (round_id + winner_ticket_id). */

export const ticketRoundEmbed = "rounds!tickets_round_id_fkey";

export const ticketRoundName = `${ticketRoundEmbed}(name)`;
export const ticketRoundDetail = `${ticketRoundEmbed}(id, name, status)`;
export const ticketRoundPdf = `${ticketRoundEmbed}(name, prize_amount, ticket_price, closes_at)`;

export const ticketAgentEmbed = "profiles!tickets_agent_id_fkey(display_name)";
