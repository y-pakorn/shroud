import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import _ from "lodash"

import { contracts } from "@/config/contract"
import { CURRENCY } from "@/config/currency"

export type PoolBalance = Record<keyof typeof CURRENCY, string>

export const usePoolBalances = ({
  ...options
}: {} & Partial<UseQueryOptions<PoolBalance>> = {}) => {
  const client = useSuiClient()
  return useQuery({
    queryKey: ["pool-balances"],
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
      const rawBalances = await client.multiGetObjects({
        ids: balanceFields.data.map((d) => d.objectId),
        options: {
          showContent: true,
        },
      })
      const balances = _.chain(rawBalances)
        .map((d) => {
          const balance = (d.data as any).content.fields.balance
          const type = (d.data as any).content.type
          const currency = _.values(CURRENCY).find(
            (t) => type === `0x2::coin::Coin<${t.coinType}>`
          )!
          return [
            currency.id,
            new BigNumber(balance).shiftedBy(-currency.decimals).toString(),
          ]
        })
        .fromPairs()
        .value()
      return balances as PoolBalance
    },
    ...options,
  })
}
