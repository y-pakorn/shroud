import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import _ from "lodash"

import { CURRENCY } from "@/config/currency"

import { useTokenPrices } from "./use-token-prices"

export const useQuoteOut = ({
  coinIn,
  coinOut,
  amount,
}: {
  coinIn: keyof typeof CURRENCY
  coinOut: keyof typeof CURRENCY
  amount?: number
}) => {
  const prices = useTokenPrices()

  const [debouncedAmount, _setDebouncedAmount] = useState(amount)
  const setDebouncedAmount = useMemo(
    () => _.debounce(_setDebouncedAmount, 500),
    [_setDebouncedAmount]
  )

  useEffect(() => {
    setDebouncedAmount(amount)
  }, [amount])

  return useQuery({
    queryKey: ["quote-out", coinIn, coinOut, debouncedAmount],
    queryFn: async () => {
      if (!debouncedAmount) {
        return null
      }

      const priceIn = prices.data?.[coinIn] || 0
      const priceOut = prices.data?.[coinOut] || 0

      if (!priceIn || !priceOut) {
        return null
      }

      const amount = new BigNumber(debouncedAmount)
        .multipliedBy(priceOut)
        .dividedBy(priceIn)
      const value = amount.multipliedBy(priceIn).toNumber()

      return {
        amount: amount.shiftedBy(CURRENCY[coinOut].decimals),
        // <100$ => 0.01%, ..., 1000000$ => 10%
        priceImact: Math.min(
          0.1, // 10% max
          Math.max(
            0.0001, // 0.01% min
            value < 100
              ? 0.0001 // 0.01% for <$100
              : value < 1000000
                ? (Math.log10(value) - 2) / 100 // Logarithmic scaling between $100-$1M
                : 0.1 // 10% for >$1M
          )
        ),
      }
    },
  })
}
