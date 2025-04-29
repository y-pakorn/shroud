import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import _ from "lodash"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { match } from "ts-pattern"

import { CURRENCY } from "@/config/currency"
import { formatter } from "@/lib/formatter"
import { useTxState } from "@/hooks/use-tx-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { network } from "./provider"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"

export function TxStateDialog() {
  const {
    operation,
    clear,
    merkleTreeSize,
    provingKeySize,
    proof,
    txHash,
    txResult,
  } = useTxState()
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (txResult) {
      setCountdown(10)
      const timer = setTimeout(() => {
        clear()
      }, 10000)
      return () => clearTimeout(timer)
    } else {
      setCountdown(null)
    }
  }, [txResult, clear])

  useEffect(() => {
    if (countdown && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => (prev ? prev - 1 : null))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [countdown])

  const step = useMemo(() => {
    if (_.isNil(merkleTreeSize)) return 0
    if (_.isNil(provingKeySize)) return 1
    if (_.isNil(proof)) return 2
    if (_.isNil(txHash)) return 3
    return 4
  }, [merkleTreeSize, provingKeySize, proof, txHash])

  return (
    <Dialog
      open={!!operation}
      onOpenChange={() => {
        if (txResult) {
          clear()
        }
      }}
    >
      <DialogContent hasCloseButton={false} className="bg-background/85 w-lg">
        <DialogHeader>
          <DialogTitle>{_.startCase(operation?.type)}</DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            {match(operation)
              .with(
                {
                  type: "deposit",
                },
                (o) => (
                  <>
                    Depositing {formatter.number(o.amount)}{" "}
                    <img
                      src={CURRENCY[o.coin].icon}
                      className="size-3 shrink-0 rounded-full"
                    />
                  </>
                )
              )
              .with(
                {
                  type: "withdraw",
                },
                (o) => (
                  <>
                    Withdrawing {formatter.number(o.amount)}{" "}
                    <img
                      src={CURRENCY[o.coin].icon}
                      className="size-3 shrink-0 rounded-full"
                    />
                  </>
                )
              )
              .with(
                {
                  type: "swap",
                },
                (o) => (
                  <>
                    Swapping {formatter.number(o.out)}{" "}
                    <img
                      src={CURRENCY[o.from].icon}
                      className="size-3 shrink-0 rounded-full"
                    />{" "}
                    for {formatter.number(o.in)}{" "}
                    <img
                      src={CURRENCY[o.to].icon}
                      className="size-3 shrink-0 rounded-full"
                    />
                  </>
                )
              )
              .otherwise(() => null)}
          </DialogDescription>
        </DialogHeader>
        <div className="text-muted-foreground text-sm">
          Do not close this window until the transaction is confirmed.
        </div>
        <div className="space-y-1">
          {step >= 0 && (
            <div className="flex items-center gap-2">
              <div className="font-light">
                Fetching global transaction history
              </div>
              <Separator className="w-full flex-1 opacity-50" />
              {_.isNil(merkleTreeSize) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <div>{formatter.number(merkleTreeSize)} Txs</div>
              )}
            </div>
          )}
          {step >= 1 && (
            <div className="flex items-center gap-2">
              <div className="font-light">Fetching ZK proving key</div>
              <Separator className="w-full flex-1 opacity-50" />
              {_.isNil(provingKeySize) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <div>{formatter.number(provingKeySize)} Bytes</div>
              )}
            </div>
          )}
          {step >= 2 && (
            <div className="flex items-center gap-2">
              <div className="font-light">Proving</div>
              <Separator className="w-full flex-1 opacity-50" />
              {_.isNil(proof) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <div className="text-end">
                  <div>Nullifier {proof.nullifier.slice(0, 10)}</div>
                  <div>New Note {proof.afterLeaf.slice(0, 10)}</div>
                  <div>Proof {proof.proof.slice(0, 10)}</div>
                </div>
              )}
            </div>
          )}
          {step >= 3 && (
            <div className="flex items-center gap-2">
              <div className="font-light">Submitting transaction</div>
              <Separator className="w-full flex-1 opacity-50" />
              {_.isNil(txHash) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <div className="inline-flex items-center gap-1">
                  {txHash.slice(0, 20)}
                  <Link
                    href={`${network.explorerUrl}/tx/${txHash}`}
                    target="_blank"
                  >
                    <Button variant="ghost" size="iconXs">
                      <ArrowUpRight />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
          {step >= 4 && (
            <div className="flex items-center gap-2">
              <div className="font-light">Waiting for confirmation</div>
              <Separator className="w-full flex-1 opacity-50" />
              {_.isNil(txResult) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <div className="inline-flex items-center gap-1">
                  At checkpoint {txResult.checkpoint}
                  <Link
                    href={`${network.explorerUrl}/checkpoint/${txResult.checkpoint}`}
                    target="_blank"
                  >
                    <Button variant="ghost" size="iconXs">
                      <ArrowUpRight />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <div className="flex items-center gap-2">
            {countdown !== null && (
              <span className="text-muted-foreground text-sm">
                Auto-closing in {countdown}s
              </span>
            )}
            <Button variant="outline" onClick={clear}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
