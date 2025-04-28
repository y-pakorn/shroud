"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import BigNumber from "bignumber.js"
import _ from "lodash"
import { ChevronDown, EyeClosed, Loader2, Pencil, Wallet } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { CURRENCY, CURRENCY_LIST } from "@/config/currency"
import { formatter } from "@/lib/formatter"
import { useActiveProtocolAccount } from "@/hooks/use-active-protocol-account"
import { useDeposit } from "@/hooks/use-deposit"
import { useProtocolBalances } from "@/hooks/use-protocol-balances"
import { useQuoteOut } from "@/hooks/use-quote-out"
import { useSwap } from "@/hooks/use-swap"
import { useTokenBalances } from "@/hooks/use-token-balances"
import { useTokenPrices } from "@/hooks/use-token-prices"
import { useWithdraw } from "@/hooks/use-withdraw"
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
import { NavBar } from "@/components/nav-bar"
import { PoolBalanceCard } from "@/components/pool-balance-card"
import { WalletCard } from "@/components/wallet-card"

export default function Home() {
  return (
    <main className="relative container space-y-4 py-8">
      <div className="fixed inset-0 z-[-1] h-screen w-screen scale-110 bg-[url('/bg.webp')] bg-cover bg-center opacity-35 blur-md" />
      <NavBar />
      <div className="relative">
        <div className="absolute top-0">
          <PoolBalanceCard />
        </div>
        <div className="absolute top-0 right-0">
          <WalletCard />
        </div>
        <div className="absolute top-0 left-1/2 w-[500px] -translate-x-1/2">
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
      </div>
    </main>
  )
}

function DepositCard() {
  const protocolAccount = useActiveProtocolAccount()
  const deposit = useDeposit()
  const balances = useTokenBalances()
  const prices = useTokenPrices()

  const schema = z.object({
    amount: z.string(),
    coin: z.enum(CURRENCY_LIST),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      coin: "USDC",
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
    const amount = parseFloat(_amount?.replace(/,/g, ""))

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

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    await deposit.mutateAsync({
      amount: data.amount,
      currency: data.coin,
    })
    form.resetField("amount")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
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
          disabled={
            !protocolAccount ||
            !value ||
            _.size(form.formState.errors) > 0 ||
            form.formState.isSubmitting
          }
        >
          {!protocolAccount
            ? "Account not activated"
            : _.chain(form.formState.errors)
                .values()
                .map((error) => error?.message)
                .compact()
                .first()
                .value() || "Deposit"}
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        </Button>
      </form>
    </Form>
  )
}

function WithdrawCard() {
  const protocolAccount = useActiveProtocolAccount()
  const withdraw = useWithdraw()
  const balances = useProtocolBalances()
  const prices = useTokenPrices()

  const schema = z.object({
    amount: z.string(),
    coin: z.enum(CURRENCY_LIST),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      coin: "USDC",
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
    const amount = parseFloat(_amount?.replace(/,/g, ""))

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

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    await withdraw.mutateAsync({
      amount: data.amount,
      currency: data.coin,
    })
    form.resetField("amount")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
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
                <EyeClosed />
              </div>
            </div>
          </CardContent>
        </Card>
        <Button
          className="w-full"
          size="lg"
          disabled={
            !protocolAccount ||
            !value ||
            _.size(form.formState.errors) > 0 ||
            form.formState.isSubmitting
          }
        >
          {!protocolAccount
            ? "Account not activated"
            : _.chain(form.formState.errors)
                .values()
                .map((error) => error?.message)
                .compact()
                .first()
                .value() || "Withdraw"}
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        </Button>
      </form>
    </Form>
  )
}

function SwapCard() {
  const protocolAccount = useActiveProtocolAccount()
  const swap = useSwap()
  const balances = useProtocolBalances()
  const prices = useTokenPrices()

  const schema = z.object({
    amount: z.string(),
    slippagePct: z.coerce
      .number()
      .min(0, "Slippage must be greater than 0")
      .max(100, "Slippage must be less than 100"),
    coinIn: z.enum(CURRENCY_LIST),
    coinOut: z.enum(CURRENCY_LIST),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      coinOut: "USDC",
      coinIn: "USDT",
      slippagePct: 0.1, // 0.1%
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
      form.setValue("coinIn", CURRENCY_LIST.find((c) => c !== coinOut)!)
    }
  }, [coinIn, coinOut])

  const { valueOut, amount } = useMemo(() => {
    const amount = parseFloat(_amount?.replace(/,/g, ""))

    if (!amount) {
      form.clearErrors("amount")
      return {
        valueOut: null,
        amount: null,
      }
    }

    if (balances.data && amount > Number(balances.data?.[coinOut] || 0)) {
      form.setError("amount", {
        message: "Insufficient balance",
      })
    }

    const value = amount * (prices.data?.[coinOut] || 0)
    return {
      valueOut: _.isNaN(value) ? null : value,
      amount: _.isNaN(amount) ? null : amount,
    }
  }, [_amount, coinOut, prices.data])

  const quote = useQuoteOut({
    coinIn,
    coinOut,
    amount: amount || undefined,
  })

  const slippagePct = useWatch({
    control: form.control,
    name: "slippagePct",
  })

  const { valueIn, amountIn, priceImpactPct, minimumReceived } = useMemo(() => {
    if (!quote.data) {
      return {
        valueIn: null,
        amountIn: null,
        minimumReceived: null,
        priceImpactPct: null,
      }
    }

    const amountIn = new BigNumber(quote.data.amount)
      .shiftedBy(-CURRENCY[coinOut].decimals)
      .toNumber()

    return {
      valueIn: _.isNaN(amountIn)
        ? null
        : amountIn * (prices.data?.[coinIn] || 0),
      amountIn: _.isNaN(amountIn) ? null : amountIn,
      priceImpactPct: quote.data.priceImact * 100,
      minimumReceived: amountIn * (1 - slippagePct / 100),
    }
  }, [quote.data, slippagePct])

  useEffect(() => {
    form.setValue("amount", "")
    form.clearErrors()
  }, [coinOut])

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    await swap.mutateAsync({
      amountOut: data.amount,
      coinIn: data.coinIn,
      coinOut: data.coinOut,
      minimumReceived: String(minimumReceived),
    })
    form.resetField("amount")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
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
                      src={CURRENCY[coinOut].icon}
                      alt={CURRENCY[coinOut].name}
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
                            "coinIn",
                            CURRENCY_LIST.find(
                              (c) => c !== coin && c !== coinOut
                            )!
                          )
                          form.setValue("coinOut", coin)
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
                {valueOut && formatter.usd(valueOut)}
              </div>
              <div
                className="flex cursor-pointer items-center justify-end gap-1 [&>svg]:size-3"
                onClick={() => {
                  form.setValue("amount", balances.data?.[coinOut] ?? "0")
                }}
              >
                <span>{formatter.number(balances.data?.[coinOut])}</span>
                <EyeClosed />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/10">
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <div>You will receive</div>
              {quote.isFetching && <Loader2 className="size-4 animate-spin" />}
            </div>
            <div className="flex items-center justify-between gap-2">
              {quote.isPending ? (
                <Skeleton className="h-12 w-40" />
              ) : (
                <Input
                  value={
                    minimumReceived ? formatter.number(minimumReceived) : "-"
                  }
                  readOnly
                  className="h-12 border-none! bg-transparent! p-0 text-3xl! font-medium focus-visible:ring-0"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="0"
                />
              )}
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
                  {CURRENCY_LIST.filter((c) => c !== coinOut).map((coin) => (
                    <DropdownMenuItem
                      key={coin}
                      onClick={() => form.setValue("coinIn", coin)}
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
              <div className="flex cursor-pointer items-center justify-end gap-1 [&>svg]:size-3">
                <span>{formatter.number(balances.data?.[coinIn])}</span>
                <EyeClosed />
              </div>
            </div>
          </CardContent>
        </Card>
        {quote.data && (
          <Card className="bg-background/10">
            <CardContent className="*:even:text-muted-foreground grid grid-cols-2 space-y-1 *:even:text-end">
              <div>Price Impact</div>
              <div>{priceImpactPct && formatter.pct(priceImpactPct)}</div>
              <div>Slippage</div>
              <div className="flex items-center justify-end gap-2">
                <div>{formatter.pct(slippagePct)}</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Pencil className="size-4 cursor-pointer" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="space-y-1 p-2">
                    <div>Slippage</div>
                    <div>
                      <Input
                        type="number"
                        value={slippagePct}
                        min={0}
                        max={100}
                        {...form.register("slippagePct")}
                      />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>Actual Received</div>
              <div>{formatter.number(amountIn)}</div>
              <div>Minimum Received After Slippage</div>
              <div>{formatter.number(minimumReceived)}</div>
            </CardContent>
          </Card>
        )}
        <Button
          className="w-full"
          size="lg"
          disabled={
            !protocolAccount ||
            !valueIn ||
            _.size(form.formState.errors) > 0 ||
            form.formState.isSubmitting
          }
        >
          {!protocolAccount
            ? "Account not activated"
            : _.chain(form.formState.errors)
                .values()
                .map((error) => error?.message)
                .compact()
                .first()
                .value() || "Swap"}
          {form.formState.isSubmitting && (
            <Loader2 className="size-4 animate-spin" />
          )}
        </Button>
      </form>
    </Form>
  )
}
