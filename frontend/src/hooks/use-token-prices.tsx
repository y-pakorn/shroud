import { HermesClient } from "@pythnetwork/hermes-client"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { BigNumber } from "bignumber.js"
import _ from "lodash"

import { CURRENCY } from "@/config/currency"

export type TokenPrices = Record<keyof typeof CURRENCY, number>

export const useTokenPrices = ({
  ...options
}: Partial<UseQueryOptions<TokenPrices>> = {}) => {
  return useQuery({
    queryKey: ["token-prices"],
    refetchInterval: 1000 * 20, // 20s
    queryFn: async () => {
      const connection = new HermesClient("https://hermes.pyth.network", {}) // See Hermes endpoints section below for other endpoints
      const price = await connection.getLatestPriceUpdates(
        _.chain(CURRENCY).values().map("pythId").value(),
        {
          parsed: true,
        }
      )
      return _.chain(price.parsed)
        .map((v) => {
          const id = _.chain(CURRENCY)
            .values()
            .find({ pythId: `0x${v.id}` })
            .value().id
          const price = new BigNumber(v.price.price)
            .shiftedBy(v.price.expo)
            .toNumber()
          return [id, price]
        })
        .fromPairs()
        .value() as Record<keyof typeof CURRENCY, number>
    },
    ...options,
  })
}
