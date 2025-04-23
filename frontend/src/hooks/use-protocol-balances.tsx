import { useQuery } from "@tanstack/react-query"
import _ from "lodash"
import { create } from "zustand"

import { CURRENCY } from "@/config/currency"

const _useBalances = create<{
  balances: Record<keyof typeof CURRENCY, string>
  setBalances: (
    balances:
      | Record<keyof typeof CURRENCY, string>
      | ((
          balances: Record<keyof typeof CURRENCY, string>
        ) => Record<keyof typeof CURRENCY, string>)
  ) => void
}>((set) => ({
  balances: { ..._.mapValues(CURRENCY, () => "0") },
  setBalances: (balances) =>
    set((state) => ({
      balances: _.isFunction(balances) ? balances(state.balances) : balances,
    })),
}))

export const useProtocolBalances = () => {
  const balances = _useBalances((b) => b.balances)
  return {
    data: balances,
  }
}
