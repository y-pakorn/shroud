import BigNumber from "bignumber.js"
import _ from "lodash"
import { Hex, pad } from "viem"
import { create } from "zustand"
import { persist } from "zustand/middleware"

import { contracts } from "@/config/contract"
import { CURRENCY, CURRENCY_LIST } from "@/config/currency"
import { getWasm } from "@/lib/utils"

interface InternalAccount {
  address: string
  _address: string
  nonce: string
  treeIndex: number | null
  lastActiveSeq: number | null
  nullifier: string | null
  balances: Record<keyof typeof CURRENCY, string>
}

interface InternalWalletStore {
  accounts: InternalAccount[]
  createAccount: (address: string, nonce: string) => Promise<void>
  getInternalAccount: (address: string) => Promise<Uint8Array>
  updateBalance: (
    address: string,
    balances: Partial<Record<keyof typeof CURRENCY, string>>
  ) => void
  incDecBalance: (
    address: string,
    currency: keyof typeof CURRENCY,
    amount: string,
    isInDecimals?: boolean
  ) => void
  updateTreeIndex: (address: string, treeIndex: number) => void
  updateLastActiveSeq: (address: string, lastActiveSeq: number) => void
  updateNullifier: (address: string, nullifier: string) => void
}

export const useInternalWallet = create<InternalWalletStore>()(
  persist(
    (set, get) => ({
      accounts: [],
      createAccount: async (address: string, nonce: string) => {
        set((state) => ({
          accounts: [
            ...state.accounts,
            {
              address: address,
              _address: pad(address as Hex).replace(/^0x/, ""),
              nonce,
              treeIndex: null,
              lastActiveSeq: null,
              nullifier: null,
              balances: _.mapValues(CURRENCY, () => "0"),
            },
          ],
        }))
      },
      getInternalAccount: async (address: string) => {
        const account = get().accounts.find(
          (account) => account.address === address
        )
        if (!account) {
          throw new Error("Account not found")
        }
        const wasm = await getWasm()
        const acc = wasm.Account.new(
          account._address,
          account.nonce.replace(/^0x/, "")
        )
        CURRENCY_LIST.forEach((c, i) => {
          acc.setBalance(BigInt(i), BigInt(account.balances[c]))
        })
        if (account.treeIndex !== null) {
          acc.setIndex(account.treeIndex)
        }
        return acc.export()
      },
      updateBalance: async (
        address: string,
        balances: Partial<Record<keyof typeof CURRENCY, string>>
      ) => {
        const account = get().accounts.find(
          (account) => account.address === address
        )
        if (!account) {
          throw new Error("Account not found")
        }
        _.entries(balances).forEach(([currency, balance]) => {
          account.balances[currency as keyof typeof CURRENCY] = balance
        })

        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.address === address ? account : account
          ),
        }))
      },
      incDecBalance: async (
        address: string,
        currency: keyof typeof CURRENCY,
        amount: string,
        isInDecimals: boolean = true
      ) => {
        const account = get().accounts.find(
          (account) => account.address === address
        )
        if (!account) {
          throw new Error("Account not found")
        }
        const cur = CURRENCY[currency]
        const fullAmount = new BigNumber(amount)
          .shiftedBy(isInDecimals ? cur.decimals : 0)
          .integerValue(BigNumber.ROUND_FLOOR)
          .toString()
        account.balances[currency] = new BigNumber(account.balances[currency])
          .plus(fullAmount)
          .toString()
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.address === address ? account : account
          ),
        }))
      },
      updateTreeIndex: async (address: string, treeIndex: number) => {
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.address === address ? { ...account, treeIndex } : account
          ),
        }))
      },
      updateLastActiveSeq: async (address: string, lastActiveSeq: number) => {
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.address === address
              ? { ...account, lastActiveSeq }
              : account
          ),
        }))
      },
      updateNullifier: async (address: string, nullifier: string) => {
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.address === address ? { ...account, nullifier } : account
          ),
        }))
      },
    }),
    {
      name: `internal-wallet-${contracts.packageId}`,
    }
  )
)
