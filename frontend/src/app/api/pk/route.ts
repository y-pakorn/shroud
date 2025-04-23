import fs from "fs/promises"
import { NextResponse } from "next/server"

export const revalidate = false

export async function GET() {
  const file = await fs.readFile(
    process.cwd() + "/../circuits_rust/pk.full.bin",
    "hex"
  )
  return NextResponse.json("0x" + file)
}
