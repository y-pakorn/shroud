import { useMemo } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import BigNumber from "bignumber.js"
import _ from "lodash"

import { CURRENCY } from "@/config/currency"

import { useInternalWallet } from "./use-internal-wallet"

export const useProtocolBalances = () => {
  const account = useCurrentAccount()
  const { accounts } = useInternalWallet()

  const found = useMemo(
    () => accounts.find((a) => a.address === account?.address),
    [accounts, account?.address]
  )

  if (!found) {
    return {
      data: _.mapValues(CURRENCY, () => "0"),
    }
  }

  return {
    data: _.fromPairs(
      _.entries(found.balances).map(([k, v]) => [
        k,
        new BigNumber(v)
          .shiftedBy(-CURRENCY[k as keyof typeof CURRENCY].decimals)
          .toString(),
      ])
    ),
  }
}
