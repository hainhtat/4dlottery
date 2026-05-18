"use client";

import ToggleButtonGroup from "@mui/joy/ToggleButtonGroup";
import IconButton from "@mui/joy/IconButton";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/i18n";

const options: { value: Locale; label: string }[] = [
  { value: "my", label: "မြန်မာ" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  if (compact) {
    return (
      <ToggleButtonGroup
        size="sm"
        value={locale}
        onChange={(_, v) => v && setLocale(v as Locale)}
      >
        {options.map((o) => (
          <IconButton key={o.value} value={o.value} aria-label={o.label} sx={{ px: 1, fontSize: "0.7rem" }}>
            {o.label}
          </IconButton>
        ))}
      </ToggleButtonGroup>
    );
  }

  return (
    <ToggleButtonGroup
      size="sm"
      value={locale}
      onChange={(_, v) => v && setLocale(v as Locale)}
      sx={{ width: "100%" }}
    >
      {options.map((o) => (
        <IconButton
          key={o.value}
          value={o.value}
          sx={{ flex: 1, fontSize: "0.75rem", fontWeight: 600 }}
        >
          {o.label}
        </IconButton>
      ))}
    </ToggleButtonGroup>
  );
}
