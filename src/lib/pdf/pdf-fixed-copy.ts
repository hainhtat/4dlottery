export function formatTicketSecurityId(publicId: string): string {
  const id = publicId.replace(/\s/g, "").toUpperCase();
  return id ? `ID ${id}` : "ID —";
}
