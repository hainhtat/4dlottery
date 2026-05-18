import en from "./messages/en.json";
import my from "./messages/my.json";

export type Locale = "en" | "my";

export const locales: Locale[] = ["my", "en"];
export const defaultLocale: Locale = "my";

const messages: Record<Locale, Record<string, string>> = { en, my };

const warnedKeys = new Set<string>();

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "my";
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export type TranslateVars = Record<string, string | number>;

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

export function t(locale: Locale, key: string, vars?: TranslateVars): string {
  const bundle = messages[locale] ?? messages[defaultLocale];
  const raw =
    bundle[key] ?? messages.en[key] ?? (locale === "en" ? undefined : messages.my[key]);

  if (raw === undefined || raw === null) {
    if (process.env.NODE_ENV === "development" && !warnedKeys.has(key)) {
      warnedKeys.add(key);
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }

  return interpolate(String(raw), vars);
}

export { en, my };
