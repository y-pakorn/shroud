import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"

import { contracts } from "@/config/contract"

export const usePoolBalances = () => {
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
    },
  })
}
