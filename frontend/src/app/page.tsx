"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/animated-tabs"
import { WalletButton } from "@/components/wallet-button"

export default function Home() {
  return (
    <main className="relative container py-8">
      <nav className="flex h-10 items-center">
        <div className="-space-y-1">
          <h1 className="text-2xl font-bold italic">SHROUD</h1>
          <p className="text-sm">Trade with privacy on Sui</p>
        </div>
        <div className="flex-1" />
        <WalletButton />
      </nav>
      <div className="absolute top-0 left-1/2 w-[400px] -translate-x-1/2 py-8">
        <Tabs defaultValue="deposit">
          <TabsList>
            <TabsTrigger value="swap">Swap</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsContent value="swap"></TabsContent>
          </TabsList>
          <TabsContent value="swap"></TabsContent>
          <TabsContent value="deposit"></TabsContent>
          <TabsContent value="withdraw"></TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
