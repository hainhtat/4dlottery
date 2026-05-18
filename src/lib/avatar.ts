/** DiceBear — free avatar API, no key required. https://www.dicebear.com */
export function avatarUrl(seed: string, size = 128): string {
  const q = new URLSearchParams({ seed, size: String(size) });
  return `https://api.dicebear.com/9.x/thumbs/svg?${q.toString()}`;
}
