import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import { ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { contracts } from "@/config/contract"
import { CURRENCY } from "@/config/currency"
import { network } from "@/components/provider"

import { useInternalWallet } from "./use-internal-wallet"
import { refreshPoolBalances } from "./use-pool-balances"
import { useProve } from "./use-prove"

export const useSwap = () => {
  const client = useSuiClient()
  const queryClient = useQueryClient()
  const currentAccount = useCurrentAccount()

  const prove = useProve()
  const {
    incDecBalance,
    updateTreeIndex,
    updateLastActiveSeq,
    updateNullifier,
    addHistory,
    getInternalAccount,
  } = useInternalWallet()

  return useMutation({
    mutationKey: ["swap"],
    mutationFn: async ({
      coinIn,
      coinOut,
      amountOut,
      minimumReceived,
    }: {
      coinIn: keyof typeof CURRENCY
      minimumReceived: string
      coinOut: keyof typeof CURRENCY
      amountOut: string
    }) => {
      const amountOutStr = amountOut.replaceAll(",", "")
      const minimumReceivedStr = minimumReceived.replaceAll(",", "")

      if (!currentAccount) {
        throw new Error("No current account")
      }

      const fullAmountIn = new BigNumber(minimumReceivedStr)
        .shiftedBy(CURRENCY[coinIn].decimals)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toString()
      const negAmountOut = new BigNumber(amountOutStr).negated().toString()
      const fullAmountOut = new BigNumber(negAmountOut)
        .shiftedBy(CURRENCY[coinOut].decimals)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toString()

      const proof = await prove.mutateAsync({
        account: await getInternalAccount(currentAccount.address),
        diffs: {
          [coinIn]: minimumReceived,
          [coinOut]: negAmountOut,
        },
        isPublic: false,
      })

      const tx = await fetch("/api/proxy-swap", {
        method: "POST",
        body: JSON.stringify({
          coinIn: CURRENCY[coinIn].coinType,
          coinOut: CURRENCY[coinOut].coinType,
          amountOut: fullAmountOut,
          minimumReceived: fullAmountIn,
          currentRoot: proof.merkleRoot,
          nullifier: proof.nullifier,
          newLeaf: proof.afterLeaf,
          proof: proof.proof,
        }),
      })

      const { digest } = await tx.json()

      console.log(digest)

      const result = await client.waitForTransaction({
        digest: digest,
        options: {
          showEffects: true,
          showEvents: true,
        },
      })
      const leafInserted = result.events!.find(
        (t) => t.type === `${contracts.packageId}::core::LeafInserted`
      )?.parsedJson as any
      const treeIndex = Number(leafInserted.index)

      updateTreeIndex(currentAccount.address, treeIndex)
      updateLastActiveSeq(currentAccount.address, Date.now())
      updateNullifier(currentAccount.address, proof.afterNullifier)
      incDecBalance(currentAccount.address, coinOut, fullAmountOut, false)
      incDecBalance(currentAccount.address, coinIn, fullAmountIn, false)
      addHistory(currentAccount.address, {
        type: "swap",
        from: coinOut,
        to: coinIn,
        out: amountOut,
        in: minimumReceived,
        timestamp: Date.now(),
        digest: digest,
      })

      refreshPoolBalances(queryClient)

      toast.success("Swap successful", {
        description: `Tx: ${digest}`,
        action: {
          label: <ExternalLink className="size-4" />,
          onClick: () => {
            window.open(`${network.explorerUrl}/tx/${digest}`, "_blank")
          },
        },
      })
    },
  })
}
