import { usePoolBalances } from "@/hooks/use-pool-balances"

import { FaucetButton } from "./faucet-button"
import { InternalWalletButton } from "./internal-wallet-button"
import { WalletButton } from "./wallet-button"

export function NavBar() {
  const poolBalances = usePoolBalances()
  return (
    <nav className="z-20! flex h-10 items-center gap-2">
      <div className="-space-y-1">
        <h1 className="text-2xl font-bold italic">SHROUD</h1>
        <p className="text-sm">Trade with privacy on Sui</p>
      </div>
      <div className="flex-1" />
      <FaucetButton />
      <WalletButton />
      <InternalWalletButton />
    </nav>
  )
}
