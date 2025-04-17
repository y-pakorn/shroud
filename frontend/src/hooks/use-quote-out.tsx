import { useEffect, useMemo, useState } from "react"
import { buildTx, getQuote } from "@7kprotocol/sdk-ts"
import { useQuery } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import _ from "lodash"

import { CURRENCY } from "@/config/currency"

export const useQuoteOut = ({
  coinIn,
  coinOut,
  amount,
}: {
  coinIn: keyof typeof CURRENCY
  coinOut: keyof typeof CURRENCY
  amount?: number
}) => {
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
      console.log(coinIn, coinOut, debouncedAmount)
      const quote = await getQuote({
        tokenIn: CURRENCY[coinIn].coinType,
        tokenOut: CURRENCY[coinOut].coinType,
        amountIn: new BigNumber(debouncedAmount || 0)
          .shiftedBy(CURRENCY[coinIn].decimals)
          .integerValue(BigNumber.ROUND_FLOOR)
          .toString(),
      })
      return quote
    },
  })
}
