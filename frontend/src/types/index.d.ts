import type { CURRENCY } from "@/config/currency"

export type Action =
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

export type AccountHistory = Action & {
  timestamp: number
  digest: string
}
