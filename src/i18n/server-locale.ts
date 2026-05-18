import { cookies } from "next/headers";
import { resolveLocale } from "@/i18n";
import { LOCALE_COOKIE } from "@/i18n/locale-storage";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
