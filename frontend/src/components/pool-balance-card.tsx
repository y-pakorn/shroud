import Link from "next/link"
import { ArrowUpRight, ExternalLink } from "lucide-react"

import { contracts } from "@/config/contract"
import { CURRENCY, CURRENCY_LIST } from "@/config/currency"
import { formatter } from "@/lib/formatter"
import { usePoolBalances } from "@/hooks/use-pool-balances"

import { network } from "./provider"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader } from "./ui/card"
import { Skeleton } from "./ui/skeleton"

export function PoolBalanceCard() {
  const poolBalances = usePoolBalances()
  return (
    <Card className="bg-background/10 w-[220px] gap-0 p-2 text-sm">
      <CardHeader className="flex items-center px-2">
        <div className="font-medium">Pool Balances</div>
        <div className="ml-auto">Contract</div>
        <Link
          href={`${network.explorerUrl}/object/${contracts.coreId}`}
          target="_blank"
          className="-ml-1"
        >
          <Button variant="ghost" size="iconXs">
            <ExternalLink />
          </Button>
        </Link>
        {/* <Link
          href={`${network.explorerUrl}/object/${contracts}`}
          target="_blank"
        >
          <Button variant="ghost" size="iconXs">
            <ExternalLink />
          </Button>
        </Link> */}
      </CardHeader>
      <CardContent className="space-y-1 px-2">
        {CURRENCY_LIST.map((c) => {
          const cur = CURRENCY[c]
          const balance = poolBalances.data?.[c]?.amount
          const id = poolBalances.data?.[c]?.id
          return (
            <div key={c} className="flex items-center gap-2">
              <img className="size-4 shrink-0 rounded-full" src={cur.icon} />
              <p>{cur.ticker}</p>
              {id && (
                <Link
                  href={`${network.explorerUrl}/object/${id}`}
                  target="_blank"
                  className="-ml-1"
                >
                  <Button variant="ghost" size="iconXs">
                    <ArrowUpRight />
                  </Button>
                </Link>
              )}
              <div className="flex-1" />
              {poolBalances.isPending ? (
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
