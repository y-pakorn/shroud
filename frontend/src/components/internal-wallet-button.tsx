import { useMemo } from "react"
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fromBytes, toBytes, toHex } from "viem"

import { useInternalWallet } from "@/hooks/use-internal-wallet"

import { Button } from "./ui/button"

export function InternalWalletButton() {
  const currentAccount = useCurrentAccount()
  const sign = useSignPersonalMessage()
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
      disabled={sign.isPending}
      onClick={async () => {
        // const randomNonce = generatePrivateKey()
        const signature = await sign.mutateAsync({
          message: toBytes(
            `Creating protocol account for ${currentAccount.address} at ${new Date().toLocaleString()}`
          ),
        })
        // base64 to bytes
        const signatureBytes = Uint8Array.from(atob(signature.signature), (c) =>
          c.charCodeAt(0)
        )
        const nonce = toHex(signatureBytes).slice(0, 66)
        createAccount(currentAccount.address, nonce)
        toast.success("Account created successfully")
      }}
    >
      Create Account {sign.isPending && <Loader2 className="animate-spin" />}
    </Button>
  )
}
