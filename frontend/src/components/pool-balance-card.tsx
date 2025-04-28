import { CURRENCY, CURRENCY_LIST } from "@/config/currency"
import { formatter } from "@/lib/formatter"
import { usePoolBalances } from "@/hooks/use-pool-balances"

import { Card, CardContent, CardHeader } from "./ui/card"
import { Skeleton } from "./ui/skeleton"

export function PoolBalanceCard() {
  const poolBalances = usePoolBalances()
  return (
    <Card className="bg-background/10 w-[180px] gap-0 p-2 text-sm">
      <CardHeader className="px-2 font-medium">Pool Balances</CardHeader>
      <CardContent className="space-y-1 px-2">
        {CURRENCY_LIST.map((c) => {
          const cur = CURRENCY[c]
          const balance = poolBalances.data?.[c]
          return (
            <div key={c} className="flex items-center gap-2">
              <img className="size-4 shrink-0 rounded-full" src={cur.icon} />
              <p>{cur.ticker}</p>
              <div className="flex-1" />
              {poolBalances.isLoading ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <p className="text-muted-foreground truncate">
                  {formatter.number(balance)}
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
