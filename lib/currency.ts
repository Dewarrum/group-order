export const COMMON_CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "KRW", label: "South Korean Won" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "INR", label: "Indian Rupee" },
  { code: "PHP", label: "Philippine Peso" },
] as const;

export function getCurrencyFractionDigits(currencyCode: string) {
  return (
    new Intl.NumberFormat("en", {
      currency: currencyCode,
      style: "currency",
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

export function formatMoney(
  amountMinor: number | null | undefined,
  currencyCode: string | null | undefined,
) {
  if (amountMinor == null) {
    return "Pending";
  }
  const code = currencyCode ?? "USD";
  const divisor = 10 ** getCurrencyFractionDigits(code);
  return new Intl.NumberFormat("en", {
    currency: code,
    style: "currency",
  }).format(amountMinor / divisor);
}

export function parseMoneyToMinorUnits(value: string, currencyCode: string) {
  const digits = getCurrencyFractionDigits(currencyCode);
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Enter a valid amount.");
  }

  return Math.round(parsed * 10 ** digits);
}
