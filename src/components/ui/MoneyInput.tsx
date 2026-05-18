"use client";

import Input, { type InputProps } from "@mui/joy/Input";
import { formatMoneyInput, parseMoneyInput } from "@/lib/utils/money";

type MoneyInputProps = Omit<InputProps, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (raw: string) => void;
};

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={formatMoneyInput(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d,]/g, "");
        const digits = raw.replace(/,/g, "");
        onValueChange(digits);
      }}
      onBlur={() => {
        if (value) onValueChange(String(parseMoneyInput(value)));
      }}
    />
  );
}
