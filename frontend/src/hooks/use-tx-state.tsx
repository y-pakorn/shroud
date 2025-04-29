import { SuiTransactionBlockResponse } from "@mysten/sui/client"
import { create } from "zustand"

import { Proof } from "@/types/worker"
import { Action } from "@/types"

interface TxStateStore {
  operation?: Action
  merkleTreeSize?: number
  provingKeySize?: number
  proof?: Proof
  txHash?: string
  txResult?: SuiTransactionBlockResponse
  startOperation: (operation: Action) => void
  setMerkleTreeSize: (size: number) => void
  setProvingKeySize: (size: number) => void
  setProof: (proof: Proof) => void
  setTxHash: (hash: string) => void
  setTxResult: (result: SuiTransactionBlockResponse) => void
  clear: () => void
}

export const useTxState = create<TxStateStore>((set, get) => ({
  operation: undefined,
  merkleTreeSize: undefined,
  provingKeySize: undefined,
  proof: undefined,
  txHash: undefined,
  txResult: undefined,
  startOperation: (operation) =>
    set({
      operation,
      merkleTreeSize: undefined,
      provingKeySize: undefined,
      proof: undefined,
      txHash: undefined,
      txResult: undefined,
    }),
  setMerkleTreeSize: (size) => set({ merkleTreeSize: size }),
  setProvingKeySize: (size) => set({ provingKeySize: size }),
  setProof: (proof) => set({ proof }),
  setTxHash: (hash) => set({ txHash: hash }),
  setTxResult: (result) => set({ txResult: result }),
  clear: () =>
    set({
      operation: undefined,
      merkleTreeSize: undefined,
      provingKeySize: undefined,
      proof: undefined,
      txHash: undefined,
      txResult: undefined,
    }),
}))

export const txState = () => useTxState.getState()
