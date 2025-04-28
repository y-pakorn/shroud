import { useMemo } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { generatePrivateKey } from "viem/accounts"

import { useInternalWallet } from "@/hooks/use-internal-wallet"

import { Button } from "./ui/button"

export function InternalWalletButton() {
  const currentAccount = useCurrentAccount()
  const { accounts, createAccount } = useInternalWallet()

  const found = useMemo(
    () =>
      accounts.find((account) => account.address === currentAccount?.address),
    [accounts, currentAccount?.address]
  )

  if (!currentAccount) {
    return null
  }

  if (found) {
    return (
      <Button className="pointer-events-none">
        Active <div className="size-3 rounded-full bg-green-400" />
      </Button>
    )
  }

  return (
    <Button
      onClick={async () => {
        const randomNonce = generatePrivateKey()
        createAccount(currentAccount.address, randomNonce)
      }}
    >
      Create Account
    </Button>
  )
}
