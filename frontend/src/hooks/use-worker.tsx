import { useEffect, useRef } from "react"

import { Proof, ProveParams } from "@/types/worker"

export const useWorker = () => {
  const workerRef = useRef<Worker>(null)

  useEffect(() => {
    workerRef.current = new Worker(new URL("../../worker.ts", import.meta.url))
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const prove = async (params: ProveParams): Promise<Proof> => {
    const worker = workerRef.current
    if (!worker) {
      throw new Error("Worker not initialized")
    }

    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent<Proof>) => {
        worker.removeEventListener("message", messageHandler)
        resolve(event.data)
      }

      const errorHandler = (error: ErrorEvent) => {
        worker.removeEventListener("error", errorHandler)
        reject(error)
      }

      worker.addEventListener("message", messageHandler)
      worker.addEventListener("error", errorHandler)
      worker.postMessage(params)
    })
  }

  return { prove }
}
