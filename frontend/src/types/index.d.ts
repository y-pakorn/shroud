import type { CURRENCY } from "@/config/currency"

export type AccountHistory = (
  | {
      type: "deposit"
      coin: keyof typeof CURRENCY
      amount: string
    }
  | {
      type: "withdraw"
      coin: keyof typeof CURRENCY
      amount: string
    }
  | {
      type: "swap"
      from: keyof typeof CURRENCY
      to: keyof typeof CURRENCY
      out: string
      in: string
    }
) & {
  timestamp: number
  digest: string
}
