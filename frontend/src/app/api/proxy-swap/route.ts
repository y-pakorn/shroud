import { NextRequest, NextResponse } from "next/server"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import { fromHex, Hex } from "viem"
import { z } from "zod"

import { env } from "@/env.mjs"
import { contracts } from "@/config/contract"

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
    target: `${contracts.packageId}::core::start_swap`,
    arguments: [
      tx.object(contracts.coreId),
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
    target: `${contracts.packageId}::router::swap`,
    arguments: [
      tx.object(contracts.routerId),
      coin,
      tx.pure.u64(minimumReceived),
    ],
    typeArguments: [coinIn, coinOut],
  })

  tx.moveCall({
    target: `${contracts.packageId}::core::end_swap`,
    arguments: [tx.object(contracts.coreId), swapBalance, finalCoin],
    typeArguments: [coinIn, coinOut],
  })

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
  })

  return NextResponse.json({ digest: result.digest })
}
