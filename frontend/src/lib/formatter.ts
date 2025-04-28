import numbro from "numbro"

export const formatter = {
  number: (v?: any) =>
    numbro(v || 0).format({
      mantissa: 6,
      thousandSeparated: true,
      optionalMantissa: true,
      trimMantissa: true,
    }),
  numberCompact: (v?: any) =>
    numbro(v || 0).format({
      mantissa: 4,
      thousandSeparated: true,
      optionalMantissa: true,
      trimMantissa: true,
    }),
  usd: (v?: any) =>
    numbro(v || 0).formatCurrency({
      mantissa: 2,
      thousandSeparated: true,
      optionalMantissa: true,
      trimMantissa: true,
      currencySymbol: "$",
    }),
  pct: (v?: any) =>
    numbro(v || 0).format({
      mantissa: 2,
      thousandSeparated: true,
      optionalMantissa: true,
    }) + "%",
}
