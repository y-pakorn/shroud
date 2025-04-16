"use client"

import { ComponentProps, useState } from "react"
import Link from "next/link"
import {
  ConnectModal,
  useAccounts,
  useCurrentAccount,
  useDisconnectWallet,
  useSuiClient,
  useSuiClientContext,
  useSwitchAccount,
} from "@mysten/dapp-kit"
import { requestSuiFromFaucetV0 } from "@mysten/sui/faucet"
import { Transaction } from "@mysten/sui/transactions"
import type { WalletAccount } from "@mysten/wallet-standard"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  Copy,
  Droplets,
  ExternalLink,
  Loader2,
  LogOut,
  PieChart,
} from "lucide-react"
import { toast } from "sonner"

import { cn, formatAddress } from "@/lib/utils"

import { network } from "./provider"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function WalletButton({
  ...props
}: React.ComponentProps<typeof Button>) {
  const currentAccount = useCurrentAccount()

  if (currentAccount) {
    return (
      <ConnectedWalletButtonContent
        variant="secondary"
        currentAccount={currentAccount}
        {...props}
      />
    )
  }

  return <WalletButtonContent variant="secondary" {...props} />
}

function ConnectedWalletButtonContent({
  currentAccount,
  className,
  ...props
}: {
  currentAccount: WalletAccount
} & ComponentProps<typeof Button>) {
  const accounts = useAccounts()
  const { mutateAsync: disconnect } = useDisconnectWallet()
  const { mutateAsync: switchAccount } = useSwitchAccount()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" {...props} className={cn("px-4!", className)}>
          {currentAccount.label ||
            `${currentAccount.address.slice(0, 4)}...${currentAccount.address.slice(-4)}`}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]">
        <div className="flex items-center gap-2 p-2">
          <div className="bg-primary size-8 rounded-full" />
          <div className="text-sm">
            <div className="font-semibold">{currentAccount.label}</div>
            <div className="text-muted-foreground">
              {formatAddress(currentAccount.address)}
            </div>
          </div>
          <Button
            size="icon"
            className="ml-auto"
            onClick={async () => {
              await navigator.clipboard.writeText(currentAccount.address)
              toast.success("Copied to clipboard")
            }}
          >
            <Copy />
          </Button>
          <Link
            href={`${network.explorerUrl}/address/${currentAccount.address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon">
              <ExternalLink />
            </Button>
          </Link>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Wallets</DropdownMenuLabel>
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.address}
              onClick={() =>
                switchAccount({
                  account,
                })
              }
            >
              <span className="text-muted-foreground text-xs">
                {formatAddress(account.address)}
              </span>
              <span className="ml-auto font-medium">{account.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()}>
          <LogOut />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WalletButtonContent({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false)

  return (
    <ConnectModal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button disabled={open} {...props} className={cn(className)}>
          {open ? (
            <>
              Connecting <Loader2 className="animate-spin" />
            </>
          ) : (
            "Connect Wallet"
          )}
        </Button>
      }
    />
  )
}
