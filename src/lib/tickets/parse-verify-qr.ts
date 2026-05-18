/** Parsed ticket verify credentials from a QR code or pasted URL. */
export interface VerifyQrCredentials {
  publicId: string;
  token: string;
}

/**
 * Extract publicId + verify token from ticket QR content.
 * Supports `/verify/{id}/{token}`, `/verify/{id}?t=`, and full absolute URLs.
 */
export function parseVerifyQrPayload(raw: string): VerifyQrCredentials | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, "https://verify.local");

    const pathMatch = url.pathname.match(/\/verify\/([^/?#]+)(?:\/([^/?#]+))?/i);
    if (!pathMatch) return null;

    const publicId = decodeURIComponent(pathMatch[1]).trim();
    const pathToken = pathMatch[2] ? decodeURIComponent(pathMatch[2]).trim() : "";
    const queryToken = url.searchParams.get("t")?.trim() ?? "";
    const token = pathToken || queryToken;

    if (!publicId || !token) return null;
    return { publicId, token };
  } catch {
    return null;
  }
}

export async function fetchVerifyResult(publicId: string, token: string) {
  const res = await fetch(
    `/api/verify?publicId=${encodeURIComponent(publicId)}&t=${encodeURIComponent(token)}`
  );
  return res.json();
}
