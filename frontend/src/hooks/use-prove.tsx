import { useSuiClient } from "@mysten/dapp-kit"
import { useMutation } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import _ from "lodash"
import { fromHex, Hex, toHex } from "viem"

import { contracts } from "@/config/contract"
import { CURRENCY, CURRENCY_LIST } from "@/config/currency"

import { txState, useTxState } from "./use-tx-state"
import { useWorker } from "./use-worker"

export const useProve = () => {
  const client = useSuiClient()
  const { prove } = useWorker()

  const getAllLeafs = async () => {
    const leafs: string[] = []
    let cursor = null
    while (true) {
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${contracts.packageId}::core::LeafInserted`,
        },
        limit: 100,
        order: "descending",
      })

      for (const event of events.data) {
        const parsed = event.parsedJson as {
          index: string
          value: string
          new_root: string
        }
        leafs.push(
          toHex(BigInt(parsed.value), {
            size: 32,
          }).replace(/^0x/, "")
        )
      }
      cursor = events.nextCursor
      if (!events.hasNextPage) {
        break
      }
    }
    leafs.reverse()
    return leafs
  }

  return useMutation({
    mutationFn: async ({
      account,
      diffs,
      isPublic,
    }: {
      account: Uint8Array
      diffs: Partial<Record<keyof typeof CURRENCY, string>>
      isPublic: boolean
    }) => {
      const leafs = await getAllLeafs()
      txState().setMerkleTreeSize(leafs.length)
      const pk = await fetch("/api/pk").then((r) => r.json())
      txState().setProvingKeySize(pk.length / 2 - 1)
      const diffsArray = CURRENCY_LIST.map((c) => {
        const cur = CURRENCY[c]
        return BigInt(
          new BigNumber(diffs[c] ?? 0)
            .shiftedBy(cur.decimals)
            .integerValue(BigNumber.ROUND_FLOOR)
            .toString()
        )
      })
      console.log("Diff", diffsArray)
      const proof = await prove({
        account,
        leafs,
        pk_bytes: fromHex(pk as Hex, "bytes"),
        diffs: new BigInt64Array(diffsArray),
        is_public: isPublic,
        aux: null,
      })
      txState().setProof(proof)
      return proof
    },
  })
}
