"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import _ from "lodash"
import { ChevronDown, EyeClosed, Wallet } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { CURRENCY, CURRENCY_LIST } from "@/config/currency"
import { formatter } from "@/lib/formatter"
import { useProtocolBalances } from "@/hooks/use-protocol-balances"
import { useQuoteOut } from "@/hooks/use-quote-out"
import { useTokenBalances } from "@/hooks/use-token-balances"
import { useTokenPrices } from "@/hooks/use-token-prices"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/animated-tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { WalletButton } from "@/components/wallet-button"

export default function Home() {
  return (
    <main className="relative container py-8">
      <div className="fixed inset-0 z-[-1] h-screen w-screen scale-110 bg-[url('/bg.webp')] bg-cover bg-center opacity-35 blur-md" />
      <nav className="flex h-10 items-center">
        <div className="-space-y-1">
          <h1 className="text-2xl font-bold italic">SHROUD</h1>
          <p className="text-sm">Trade with privacy on Sui</p>
        </div>
        <div className="flex-1" />
        <WalletButton />
      </nav>
      <div className="absolute top-0 left-1/2 w-[500px] -translate-x-1/2 py-8">
        <Tabs defaultValue="swap">
          <TabsList>
            <TabsTrigger value="swap">Swap</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsContent value="swap"></TabsContent>
          </TabsList>
          <TabsContent value="swap">
            <SwapCard />
          </TabsContent>
          <TabsContent value="deposit">
            <DepositCard />
          </TabsContent>
          <TabsContent value="withdraw">
            <WithdrawCard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function DepositCard() {
  const balances = useTokenBalances()
  const prices = useTokenPrices()

  const schema = z.object({
    amount: z.string(),
    coin: z.enum(CURRENCY_LIST),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      coin: "SUI",
    },
  })

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit and non-decimal characters
    const cleanedValue = e.target.value.replace(/[^\d.]/g, "")

    // Ensure only one decimal point and add 0 if starts with decimal
    const parts = cleanedValue.split(".")
    if (cleanedValue.startsWith(".")) {
      form.setValue("amount", `0${cleanedValue}`)
    } else {
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      const value = parts.length === 2 ? `${intPart}.${parts[1]}` : intPart
      // Add thousands separator commas
      form.setValue("amount", value)
    }
  }

  const _amount = useWatch({
    control: form.control,
    name: "amount",
  })

  const coin = useWatch({
    control: form.control,
    name: "coin",
  })

  const value = useMemo(() => {
    const amount = parseFloat(_amount)

    if (!amount) {
      form.clearErrors("amount")
      return null
    }

    if (balances.data && amount > Number(balances.data?.[coin] || 0)) {
      form.setError("amount", {
        message: "Insufficient balance",
      })
    }

    const value = amount * (prices.data?.[coin] || 0)
    return _.isNaN(value) ? null : value
  }, [_amount, coin, prices.data])

  useEffect(() => {
    form.setValue("amount", "")
    form.clearErrors()
  }, [coin])

  return (
    <Form {...form}>
      <div className="space-y-2">
        <Card className="bg-background/10">
          <CardContent className="space-y-1">
            <div>You will deposit</div>
            <div className="flex items-center justify-between gap-2">
              <Input
                {...form.register("amount")}
                onChange={handleAmountChange}
                className="h-12 border-none! bg-transparent! p-0 text-3xl! font-medium focus-visible:ring-0"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder="0"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12">
                    <img
                      src={CURRENCY[coin].icon}
                      alt={CURRENCY[coin].name}
                      className="size-6 shrink-0 rounded-full"
                    />
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {CURRENCY_LIST.map((coin) => (
                    <DropdownMenuItem
                      key={coin}
                      onClick={() => form.setValue("coin", coin)}
                      className="w-[250px]"
                    >
                      <img
                        src={CURRENCY[coin].icon}
                        alt={CURRENCY[coin].name}
                        className="size-6 shrink-0 rounded-full"
                      />
                      <span className="text-muted-foreground">
                        {CURRENCY[coin].name}
                      </span>
                      <span className="ml-auto">
                        {balances.isPending ? (
                          <Skeleton className="h-4 w-8" />
                        ) : (
                          <span>{formatter.number(balances.data?.[coin])}</span>
                        )}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="text-muted-foreground">
                {value && formatter.usd(value)}
              </div>
              <div
                className="flex cursor-pointer items-center justify-end gap-1 [&>svg]:size-3"
                onClick={() => {
                  form.setValue("amount", balances.data?.[coin] ?? "0")
                }}
              >
                {balances.isPending ? (
                  <Skeleton className="h-4 w-8" />
                ) : (
                  <span>{formatter.number(balances.data?.[coin])}</span>
                )}
                <Wallet />
              </div>
            </div>
          </CardContent>
        </Card>
        <Button
          className="w-full"
          size="lg"
          disabled={!value || _.size(form.formState.errors) > 0}
        >
          {_.chain(form.formState.errors)
            .values()
            .map((error) => error?.message)
            .compact()
            .first()
            .value() || "Deposit"}
        </Button>
      </div>
    </Form>
  )
}

function WithdrawCard() {
  const balances = useProtocolBalances()
  const prices = useTokenPrices()

  const schema = z.object({
    amount: z.string(),
    coin: z.enum(CURRENCY_LIST),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      coin: "SUI",
    },
  })

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit and non-decimal characters
    const cleanedValue = e.target.value.replace(/[^\d.]/g, "")

    // Ensure only one decimal point and add 0 if starts with decimal
    const parts = cleanedValue.split(".")
    if (cleanedValue.startsWith(".")) {
      form.setValue("amount", `0${cleanedValue}`)
    } else {
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      const value = parts.length === 2 ? `${intPart}.${parts[1]}` : intPart
      // Add thousands separator commas
      form.setValue("amount", value)
    }
  }

  const _amount = useWatch({
    control: form.control,
    name: "amount",
  })

  const coin = useWatch({
    control: form.control,
    name: "coin",
  })

  const value = useMemo(() => {
    const amount = parseFloat(_amount)

    if (!amount) {
      form.clearErrors("amount")
      return null
    }

    if (balances.data && amount > Number(balances.data?.[coin] || 0)) {
      form.setError("amount", {
        message: "Insufficient balance",
      })
    }

    const value = amount * (prices.data?.[coin] || 0)
    return _.isNaN(value) ? null : value
  }, [_amount, coin, prices.data])

  useEffect(() => {
    form.setValue("amount", "")
    form.clearErrors()
  }, [coin])

  return (
    <Form {...form}>
      <div className="space-y-2">
        <Card className="bg-background/10">
          <CardContent className="space-y-1">
            <div>You will withdraw</div>
            <div className="flex items-center justify-between gap-2">
              <Input
                {...form.register("amount")}
                onChange={handleAmountChange}
                className="h-12 border-none! bg-transparent! p-0 text-3xl! font-medium focus-visible:ring-0"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder="0"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12">
                    <img
                      src={CURRENCY[coin].icon}
                      alt={CURRENCY[coin].name}
                      className="size-6 shrink-0 rounded-full"
                    />
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {CURRENCY_LIST.map((coin) => (
                    <DropdownMenuItem
                      key={coin}
                      onClick={() => form.setValue("coin", coin)}
                      className="w-[200px]"
                    >
                      <img
                        src={CURRENCY[coin].icon}
                        alt={CURRENCY[coin].name}
                        className="size-6 shrink-0 rounded-full"
                      />
                      <span className="text-muted-foreground">
                        {CURRENCY[coin].name}
                      </span>
                      <span className="ml-auto">
                        <span>{formatter.number(balances.data?.[coin])}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="text-muted-foreground">
                {value && formatter.usd(value)}
              </div>
              <div
                className="flex cursor-pointer items-center justify-end gap-1 [&>svg]:size-3"
                onClick={() => {
                  form.setValue("amount", balances.data?.[coin] ?? "0")
                }}
              >
                <span>{formatter.number(balances.data?.[coin])}</span>
                <Wallet />
              </div>
            </div>
          </CardContent>
        </Card>
        <Button
          className="w-full"
          size="lg"
          disabled={!value || _.size(form.formState.errors) > 0}
        >
          {_.chain(form.formState.errors)
            .values()
            .map((error) => error?.message)
            .compact()
            .first()
            .value() || "Withdraw"}
        </Button>
      </div>
    </Form>
  )
}

function SwapCard() {
  const balances = useProtocolBalances()
  const prices = useTokenPrices()

  const schema = z.object({
    amount: z.string(),
    coinIn: z.enum(CURRENCY_LIST),
    coinOut: z.enum(CURRENCY_LIST),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      coinIn: "SUI",
      coinOut: "USDC",
    },
  })

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit and non-decimal characters
    const cleanedValue = e.target.value.replace(/[^\d.]/g, "")

    // Ensure only one decimal point and add 0 if starts with decimal
    const parts = cleanedValue.split(".")
    if (cleanedValue.startsWith(".")) {
      form.setValue("amount", `0${cleanedValue}`)
    } else {
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      const value = parts.length === 2 ? `${intPart}.${parts[1]}` : intPart
      // Add thousands separator commas
      form.setValue("amount", value)
    }
  }

  const _amount = useWatch({
    control: form.control,
    name: "amount",
  })

  const coinIn = useWatch({
    control: form.control,
    name: "coinIn",
  })

  const coinOut = useWatch({
    control: form.control,
    name: "coinOut",
  })

  useEffect(() => {
    if (coinIn === coinOut) {
      form.setValue("coinOut", CURRENCY_LIST.find((c) => c !== coinIn)!)
    }
  }, [coinIn, coinOut])

  const valueIn = useMemo(() => {
    const amount = parseFloat(_amount)

    if (!amount) {
      form.clearErrors("amount")
      return null
    }

    if (balances.data && amount > Number(balances.data?.[coinIn] || 0)) {
      form.setError("amount", {
        message: "Insufficient balance",
      })
    }

    const value = amount * (prices.data?.[coinIn] || 0)
    return _.isNaN(value) ? null : value
  }, [_amount, coinIn, prices.data])

  useEffect(() => {
    form.setValue("amount", "")
    form.clearErrors()
  }, [coinIn])

  return (
    <Form {...form}>
      <div className="space-y-2">
        <Card className="bg-background/10">
          <CardContent className="space-y-1">
            <div>You will spend</div>
            <div className="flex items-center justify-between gap-2">
              <Input
                {...form.register("amount")}
                onChange={handleAmountChange}
                className="h-12 border-none! bg-transparent! p-0 text-3xl! font-medium focus-visible:ring-0"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder="0"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12">
                    <img
                      src={CURRENCY[coinIn].icon}
                      alt={CURRENCY[coinIn].name}
                      className="size-6 shrink-0 rounded-full"
                    />
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {CURRENCY_LIST.map((coin) => (
                    <DropdownMenuItem
                      key={coin}
                      onClick={() => {
                        if (coin === coinOut) {
                          form.setValue(
                            "coinOut",
                            CURRENCY_LIST.find(
                              (c) => c !== coin && c !== coinIn
                            )!
                          )
                          form.setValue("coinIn", coin)
                        }
                      }}
                      className="w-[200px]"
                    >
                      <img
                        src={CURRENCY[coin].icon}
                        alt={CURRENCY[coin].name}
                        className="size-6 shrink-0 rounded-full"
                      />
                      <span className="text-muted-foreground">
                        {CURRENCY[coin].name}
                      </span>
                      <span className="ml-auto">
                        <span>{formatter.number(balances.data?.[coin])}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="text-muted-foreground">
                {valueIn && formatter.usd(valueIn)}
              </div>
              <div
                className="flex cursor-pointer items-center justify-end gap-1 [&>svg]:size-3"
                onClick={() => {
                  form.setValue("amount", balances.data?.[coinIn] ?? "0")
                }}
              >
                <span>{formatter.number(balances.data?.[coinIn])}</span>
                <Wallet />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/10">
          <CardContent className="space-y-1">
            <div>You will receive</div>
            <div className="flex items-center justify-between gap-2">
              <Input
                {...form.register("amount")}
                onChange={handleAmountChange}
                className="h-12 border-none! bg-transparent! p-0 text-3xl! font-medium focus-visible:ring-0"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder="0"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-12">
                    <img
                      src={CURRENCY[coinOut].icon}
                      alt={CURRENCY[coinOut].name}
                      className="size-6 shrink-0 rounded-full"
                    />
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {CURRENCY_LIST.filter((c) => c !== coinIn).map((coin) => (
                    <DropdownMenuItem
                      key={coin}
                      onClick={() => form.setValue("coinOut", coin)}
                      className="w-[200px]"
                    >
                      <img
                        src={CURRENCY[coin].icon}
                        alt={CURRENCY[coin].name}
                        className="size-6 shrink-0 rounded-full"
                      />
                      <span className="text-muted-foreground">
                        {CURRENCY[coin].name}
                      </span>
                      <span className="ml-auto">
                        <span>{formatter.number(balances.data?.[coin])}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* <div className="flex items-center justify-between gap-2 text-sm">
              <div className="text-muted-foreground">
                {value && formatter.usd(value)}
              </div>
              <div
                className="flex cursor-pointer items-center justify-end gap-1 [&>svg]:size-3"
                onClick={() => {
                  form.setValue("amount", balances.data?.[coin] ?? "0")
                }}
              >
                <span>{formatter.number(balances.data?.[coin])}</span>
                <Wallet />
              </div>
            </div> */}
          </CardContent>
        </Card>
        <Button
          className="w-full"
          size="lg"
          disabled={!valueIn || _.size(form.formState.errors) > 0}
        >
          {_.chain(form.formState.errors)
            .values()
            .map((error) => error?.message)
            .compact()
            .first()
            .value() || "Swap"}
        </Button>
      </div>
    </Form>
  )
}
