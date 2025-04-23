import { useMutation } from "@tanstack/react-query"
import { fromHex, Hex } from "viem"

export const useProve = () => {
  return useMutation({
    mutationFn: async () => {
      console.log("Importing wasm")
      const wasm = await import("circuits_rust")
      console.log("Got wasm")
      const address =
        "0xe5a00e3673d102b84e0010df5a1387524a574f0b88c6252ef2fef8a3caf49f80"
      const nonce =
        "e5a00e3673d102b84e0010df5a1387524a574f0b88c6252ef2fef8a3caf49f80"
      const account = wasm.Account.new(address, nonce)
      const state = wasm.State.new(account)
      console.log("Initialized state, fetching pk")
      const pk = await fetch("/api/pk").then((r) => r.json())
      console.log("Got pk, proving")
      const proof = wasm.prove(
        state,
        fromHex(pk as Hex, "bytes"),
        new BigInt64Array([1n, 0n, 0n, 0n, 0n]),
        true,
        null
      )
      console.log("Proved")
      console.log(proof)
    },
  })
}
