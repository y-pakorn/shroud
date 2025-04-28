import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import { ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { fromHex } from "viem"

import { contracts } from "@/config/contract"
import { CURRENCY } from "@/config/currency"
import { network } from "@/components/provider"

import { useInternalWallet } from "./use-internal-wallet"
import { refreshPoolBalances } from "./use-pool-balances"
import { useProve } from "./use-prove"
import { refreshTokenBalances } from "./use-token-balances"

export const useDeposit = () => {
  const client = useSuiClient()
  const currentAccount = useCurrentAccount()
  const sae = useSignAndExecuteTransaction()
  const queryClient = useQueryClient()

  const prove = useProve()
  const {
    incDecBalance,
    updateTreeIndex,
    updateLastActiveSeq,
    updateNullifier,
    getInternalAccount,
  } = useInternalWallet()

  return useMutation({
    mutationFn: async ({
      amount,
      currency,
    }: {
      amount: string
      currency: keyof typeof CURRENCY
    }) => {
      if (!currentAccount) {
        throw new Error("No current account")
      }

      const cur = CURRENCY[currency]
      const fullAmount = new BigNumber(amount)
        .shiftedBy(cur.decimals)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toString()

      const proof = await prove.mutateAsync({
        account: await getInternalAccount(currentAccount.address),
        diffs: {
          [currency]: amount,
        },
        isPublic: true,
      })

      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: cur.coinType,
      })

      if (!coins.data.length) {
        throw new Error("No coins")
      }

      const tx = new Transaction()
      if (coins.data.length > 1) {
        tx.mergeCoins(
          coins.data[0].coinObjectId,
          coins.data.slice(1).map((c) => c.coinObjectId)
        )
      }
      const [coin] = tx.splitCoins(coins.data[0].coinObjectId, [fullAmount])

      tx.moveCall({
        target: `${contracts.packageId}::core::deposit`,
        typeArguments: [cur.coinType],
        arguments: [
          tx.object(contracts.coreId),
          coin,
          tx.pure.u256(fromHex(proof.merkleRoot, "bigint")),
          tx.pure.u256(fromHex(proof.nullifier, "bigint")),
          tx.pure.u256(fromHex(proof.afterLeaf, "bigint")),
          tx.pure.vector("u8", fromHex(proof.proof, "bytes")),
        ],
      })

      const txs = await sae.mutateAsync({
        transaction: tx,
      })

      const result = await client.waitForTransaction({
        digest: txs.digest,
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
      incDecBalance(currentAccount.address, currency, fullAmount, false)

      refreshTokenBalances(queryClient, currentAccount.address)
      refreshPoolBalances(queryClient)

      toast.success("Deposit successful", {
        description: `Tx: ${txs.digest}`,
        action: {
          label: <ExternalLink className="size-4" />,
          onClick: () => {
            window.open(`${network.explorerUrl}/tx/${txs.digest}`, "_blank")
          },
        },
      })
    },
    onError: (error) => {
      toast.error("Deposit failed", {
        description: error.message,
      })
    },
  })
}
