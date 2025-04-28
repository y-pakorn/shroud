import { Hex } from "viem"

export type Proof = {
  afterLeaf: Hex
  afterNullifier: Hex
  nullifier: Hex
  merkleRoot: Hex
  address: Hex
  diffHash: Hex
  proof: Hex
  publicInputs: Hex
}

export type ProveParams = {
  account: Uint8Array
  leafs: string[]
  pk_bytes: Uint8Array
  diffs: BigInt64Array
  is_public: boolean
  aux?: string | null
}
