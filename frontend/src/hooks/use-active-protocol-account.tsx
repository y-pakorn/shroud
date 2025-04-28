import { useMemo } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"

import { useInternalWallet } from "./use-internal-wallet"

export const useActiveProtocolAccount = () => {
  const { accounts } = useInternalWallet()
  const currentAccount = useCurrentAccount()

  const account = useMemo(() => {
    if (!currentAccount) {
      return null
    }
    return (
      accounts.find((account) => account.address === currentAccount.address) ||
      null
    )
  }, [accounts, currentAccount])

  return account
}
