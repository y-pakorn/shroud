"use client"

import "@mysten/dapp-kit/dist/index.css"

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit"
import { getFullnodeUrl } from "@mysten/sui/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()
export const networks = {
  testnet: {
    url: getFullnodeUrl("testnet"),
    explorerUrl: "https://suiscan.xyz/testnet",
  },
}
export const network = networks.testnet

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} network="testnet">
        <WalletProvider
          autoConnect
          stashedWallet={{
            name: "Shroud",
          }}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
