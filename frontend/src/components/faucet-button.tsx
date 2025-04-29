import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"
import { requestSuiFromFaucetV2 } from "@mysten/sui/faucet"
import { Transaction } from "@mysten/sui/transactions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import _ from "lodash"
import { Droplets, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { contracts } from "@/config/contract"
import { CURRENCY } from "@/config/currency"
import { refreshTokenBalances } from "@/hooks/use-token-balances"

import { network } from "./provider"
import { Button } from "./ui/button"

export function FaucetButton() {
  const account = useCurrentAccount()
  const sae = useSignAndExecuteTransaction()
  const queryClient = useQueryClient()

  const request = useMutation({
    mutationKey: ["request-faucet", account?.address],
    mutationFn: async () => {
      if (!account?.address) {
        throw new Error("No account found")
      }
      await requestSuiFromFaucetV2({
        host: network.faucetUrl,
        recipient: account.address,
      })
      toast.success("SUI Token faucet request sent.")

      const tx = new Transaction()
      _.values(CURRENCY).forEach((currency) => {
        const coin = tx.moveCall({
          target: `${contracts.packageId}::router::mint`,
          typeArguments: [currency.coinType],
          arguments: [
            tx.object(contracts.routerId),
            tx.pure.u64(
              new BigNumber(currency.faucetAmount)
                .shiftedBy(currency.decimals)
                .toNumber()
            ),
          ],
        })
        tx.transferObjects([coin], account.address)
      })

      await sae.mutateAsync({
        transaction: tx,
      })

      toast.success("Token faucet request sent.")

      refreshTokenBalances(queryClient, account.address)
    },
  })

  return (
    <Button
      variant="outline"
      onClick={() => request.mutateAsync()}
      disabled={request.isPending || !account?.address}
    >
      <Droplets />
      Faucet
      {request.isPending && <Loader2 className="animate-spin" />}
    </Button>
  )
}
