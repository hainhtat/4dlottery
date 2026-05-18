export function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 2) return "*".repeat(trimmed.length || 1);
  return trimmed[0] + "*".repeat(Math.max(1, trimmed.length - 2)) + trimmed[trimmed.length - 1];
}

export function maskContact(contact: string): string {
  const digits = contact.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return "*".repeat(digits.length - 4) + digits.slice(-4);
}
