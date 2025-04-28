import { FaucetButton } from "./faucet-button"
import { InternalWalletButton } from "./internal-wallet-button"
import { WalletButton } from "./wallet-button"

export const NAVBAR_HEIGHT = "40px"

export function NavBar() {
  return (
    <nav
      className="z-20! flex items-center gap-2"
      style={{
        height: NAVBAR_HEIGHT,
      }}
    >
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
