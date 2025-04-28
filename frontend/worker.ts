import type { ProveParams } from "@/types/worker"
import { getWasm } from "@/lib/utils"

addEventListener("message", async (event: MessageEvent<ProveParams>) => {
  const data = event.data
  console.log("START PROVING")
  const wasm = await getWasm()

  const account = wasm.Account.import(data.account)
  const state = wasm.State.new(account)
  state.setLeafs(data.leafs)

  const _proof = new Map(
    wasm.prove(state, data.pk_bytes, data.diffs, data.is_public, data.aux)
  )

  const proof = {
    afterLeaf: `0x${_proof.get("after_leaf")}`,
    afterNullifier: `0x${_proof.get("after_nullifier")}`,
    nullifier: `0x${_proof.get("nullifier")}`,
    merkleRoot: `0x${_proof.get("merkle_root")}`,
    diffHash: `0x${_proof.get("diff_hash")}`,
    proof: `0x${_proof.get("proof")}`,
    address: `0x${_proof.get("address")}`,
    publicInputs: `0x${_proof.get("public_inputs")}`,
  }

  postMessage(proof)
})
