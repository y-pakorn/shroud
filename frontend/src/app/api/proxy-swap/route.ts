import { NextRequest, NextResponse } from "next/server"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import { fromHex, Hex } from "viem"
import { z } from "zod"

import { env } from "@/env.mjs"
import { CONTRACT_ADDRESS, CORE_OBJECT } from "@/config/contract"

const schema = z.object({
  coinIn: z.string(),
  coinOut: z.string(),
  amountIn: z.number(),
  minimumReceived: z.number(),
  currentRoot: z.string(),
  nullifier: z.string(),
  newLeaf: z.string(),
  proof: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    coinIn,
    coinOut,
    amountIn,
    minimumReceived,
    currentRoot,
    nullifier,
    newLeaf,
    proof,
  } = await schema.parseAsync(body)

  const keypair = decodeSuiPrivateKey(env.PROXY_PRIVATE_KEY)
  const signer = Ed25519Keypair.fromSecretKey(keypair.secretKey)
  const client = new SuiClient({
    url: getFullnodeUrl("testnet"),
  })

  const tx = new Transaction()

  const [coin, swapBalance] = tx.moveCall({
    target: `${CONTRACT_ADDRESS}::core::start_swap`,
    arguments: [
      tx.object(CORE_OBJECT),
      tx.pure.u64(amountIn),
      tx.pure.u64(minimumReceived),
      tx.pure.u256(fromHex(currentRoot as Hex, "bigint")),
      tx.pure.u256(fromHex(nullifier as Hex, "bigint")),
      tx.pure.u256(fromHex(newLeaf as Hex, "bigint")),
      tx.pure.vector("u8", fromHex(proof as Hex, "bytes")),
    ],
    typeArguments: [coinIn, coinOut],
  })

  const [finalCoin] = tx.moveCall({
    target: `0xebebb67fc6fc6a74be5e57d90563c709631b4da86091c0926db81894add36ed3::router::swap_exact_input_direct`,
    arguments: [
      tx.object(
        "0xcbca62dbd54d3a8545f27a298872b1af9363a82a04a329504b1f0fef0a5f9ce4"
      ),
      coin,
    ],
    typeArguments: [coinIn, coinOut],
  })

  tx.moveCall({
    target: `${CONTRACT_ADDRESS}::core::end_swap`,
    arguments: [tx.object(CORE_OBJECT), swapBalance, finalCoin],
  })

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
  })

  return NextResponse.json({ digest: result.digest })
}
