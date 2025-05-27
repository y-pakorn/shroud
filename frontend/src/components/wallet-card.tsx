import { useState } from "react"
import Link from "next/link"
import dayjs from "dayjs"
import _ from "lodash"
import { ChevronDown, ExternalLink, FileUp } from "lucide-react"
import { match, P } from "ts-pattern"

import { CURRENCY, CURRENCY_LIST } from "@/config/currency"
import { formatter } from "@/lib/formatter"
import { cn } from "@/lib/utils"
import { useActiveProtocolAccount } from "@/hooks/use-active-protocol-account"
import { useProtocolBalances } from "@/hooks/use-protocol-balances"

import { network } from "./provider"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader } from "./ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"

export function WalletCard() {
  const account = useActiveProtocolAccount()
  const balances = useProtocolBalances()

  if (!account) return null

  return (
    <Card className="bg-background/10 w-[250px] gap-0 py-2 text-sm">
      <CardHeader className="flex items-center justify-between px-4 font-medium">
        <div>Protocol Wallet</div>
      </CardHeader>
      <Separator className="mb-2" />
      <CardContent className="space-y-1 px-4">
        <Collapsible defaultOpen className="space-y-1">
          <div className="flex items-center justify-between">
            <div>Balance</div>
            <CollapsibleTrigger>
              <ChevronDown />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {CURRENCY_LIST.map((c) => {
              const cur = CURRENCY[c]
              const balance = balances.data?.[c]
              return (
                <div key={c} className="flex items-center gap-2">
                  <img
                    className="size-4 shrink-0 rounded-full"
                    src={cur.icon}
                  />
                  <p>{cur.ticker}</p>
                  <div className="flex-1" />
                  <p className="text-muted-foreground truncate">
                    {formatter.number(balance)}
                  </p>
                </div>
              )
            })}
          </CollapsibleContent>
        </Collapsible>
        {account.history.length > 0 && (
          <>
            <Separator className="-mx-4" />
            <Collapsible defaultOpen className="space-y-1">
              <div className="flex items-center gap-2">
                <div>History</div>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground ml-auto"
                  onClick={() => {
                    // export history as .json file
                    const history = account.history
                    const file = new File(
                      [JSON.stringify(history, null, 2)],
                      "history.json",
                      {
                        type: "application/json",
                      }
                    )
                    const url = URL.createObjectURL(file)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "history.json"
                    a.click()
                  }}
                >
                  Export <FileUp />
                </Button>
                <CollapsibleTrigger>
                  <ChevronDown />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="h-full space-y-2 overflow-y-auto">
                    {account.history.map((h, i) => (
                      <div key={i} className="-space-y-0.5">
                        {match(h)
                          .with(
                            {
                              type: P.union("deposit", "withdraw"),
                            },
                            (h) => (
                              <div className="flex items-center gap-1">
                                <p>{_.startCase(h.type)}</p>
                                <p
                                  className={cn(
                                    "ml-auto",
                                    h.type === "deposit" && "text-green-300",
                                    h.type === "withdraw" && "text-red-300"
                                  )}
                                >
                                  {h.type === "deposit" ? "+" : "-"}
                                  {formatter.number(h.amount)}
                                </p>
                                <img
                                  className="size-4 shrink-0 rounded-full"
                                  src={CURRENCY[h.coin].icon}
                                />
                              </div>
                            )
                          )
                          .otherwise((h) => (
                            <div className="flex items-center gap-1">
                              <p>{_.startCase(h.type)}</p>
                              <p className="ml-auto truncate text-red-300">
                                -{formatter.numberCompact(h.out)}
                              </p>
                              <img
                                className="size-4 shrink-0 rounded-full"
                                src={CURRENCY[h.from].icon}
                              />
                              <p className="truncate text-green-300">
                                -{formatter.numberCompact(h.in)}
                              </p>
                              <img
                                className="size-4 shrink-0 rounded-full"
                                src={CURRENCY[h.to].icon}
                              />
                            </div>
                          ))}
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                          <div>{dayjs(h.timestamp).format("MMM D, HH:mm")}</div>
                          <Link
                            href={`${network.explorerUrl}/tx/${h.digest}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto"
                          >
                            <Button variant="ghost" size="xs">
                              {h.digest.slice(0, 6)}
                              <ExternalLink />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  )
}
