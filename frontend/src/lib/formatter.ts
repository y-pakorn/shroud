import numbro from "numbro"

export const formatter = {
  number: (v?: any) =>
    numbro(v || 0).format({
      mantissa: 6,
      thousandSeparated: true,
      optionalMantissa: true,
    }),
  usd: (v?: any) =>
    numbro(v || 0).formatCurrency({
      mantissa: 2,
      thousandSeparated: true,
      optionalMantissa: true,
      currencySymbol: "$",
    }),
  pct: (v?: any) =>
    numbro(v || 0).format({
      mantissa: 2,
      thousandSeparated: true,
      optionalMantissa: true,
    }) + "%",
}
