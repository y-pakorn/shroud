"use client"

import "@mysten/dapp-kit/dist/index.css"

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit"
import { getFullnodeUrl } from "@mysten/sui/client"
import { getFaucetHost } from "@mysten/sui/faucet"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      experimental_prefetchInRender: true,
    },
  },
})
export const networks = {
  devnet: {
    url: getFullnodeUrl("devnet"),
    explorerUrl: "https://suiscan.xyz/devnet",
    faucetUrl: getFaucetHost("devnet"),
  },
}
export const network = networks.devnet

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} network="devnet">
        <WalletProvider
          autoConnect
          slushWallet={{
            name: "Shroud",
          }}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
