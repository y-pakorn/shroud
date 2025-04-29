import { useSuiClient } from "@mysten/dapp-kit"
import { QueryClient, useQuery, UseQueryOptions } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import _ from "lodash"

import { contracts } from "@/config/contract"
import { CURRENCY } from "@/config/currency"

export type PoolBalance = Record<
  keyof typeof CURRENCY,
  {
    amount: string
    id: string
  }
>

export const refreshPoolBalances = (client: QueryClient) => {
  client.invalidateQueries({
    exact: true,
    queryKey: ["pool-balances"],
  })
}

export const usePoolBalances = ({
  ...options
}: {} & Partial<UseQueryOptions<PoolBalance>> = {}) => {
  const client = useSuiClient()

  const poolBalanceIds = useQuery({
    queryKey: ["pool-balance-ids"],
    queryFn: async () => {
      const object = await client.getObject({
        id: contracts.coreId,
        options: {
          showContent: true,
        },
      })
      console.log(object)
      const balanceBagId = (object.data as any).content.fields.balances.fields
        .id.id

      const balanceFields = await client.getDynamicFields({
        parentId: balanceBagId,
      })

      return balanceFields.data.map((d) => d.objectId)
    },
  })

  return useQuery({
    queryKey: ["pool-balances"],
    enabled: !!poolBalanceIds.data,
    refetchInterval: 60 * 1000, // 1 minute
    queryFn: async () => {
      const rawBalances = await client.multiGetObjects({
        ids: poolBalanceIds.data!,
        options: {
          showContent: true,
        },
      })
      const balances = _.chain(rawBalances)
        .zip(poolBalanceIds.data!)
        .map(([d, id]) => {
          const balance = (d!.data as any).content.fields.balance
          const type = (d!.data as any).content.type
          const currency = _.values(CURRENCY).find(
            (t) => type === `0x2::coin::Coin<${t.coinType}>`
          )!
          return [
            currency.id,
            {
              amount: new BigNumber(balance)
                .shiftedBy(-currency.decimals)
                .toString(),
              id,
            },
          ]
        })
        .fromPairs()
        .value()
      return balances as PoolBalance
    },
    ...options,
  })
}
