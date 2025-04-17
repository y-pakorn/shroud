import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { BigNumber } from "bignumber.js"
import _ from "lodash"

import { CURRENCY, CURRENCY_LIST } from "@/config/currency"

export type TokenBalances = Record<keyof typeof CURRENCY, string>

export const useTokenBalances = ({
  ...options
}: Partial<UseQueryOptions<TokenBalances>> = {}) => {
  const account = useCurrentAccount()
  const client = useSuiClient()
  return useQuery({
    queryKey: ["token-balances", account?.address],
    queryFn: async () => {
      if (!account) return _.mapValues(CURRENCY, () => "0")
      const balances = await Promise.all(
        CURRENCY_LIST.map(async (c) => {
          const cur = CURRENCY[c]
          const balance = await client.getBalance({
            owner: account.address,
            coinType: cur.coinType,
          })
          const amount = new BigNumber(balance.totalBalance).shiftedBy(
            -cur.decimals
          )
          return [c, amount.toString()]
        })
      )
      return _.fromPairs(balances) as Record<keyof typeof CURRENCY, string>
    },
    ...options,
  })
}
