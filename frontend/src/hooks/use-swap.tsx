import { useMutation } from "@tanstack/react-query"

export const useSwap = () => {
  return useMutation({
    mutationKey: ["swap"],
    mutationFn: async ({
      coinIn,
      coinOut,
      amountIn,
      minimumReceived,
    }: {
      coinIn: string
      coinOut: string
      amountIn: number
      minimumReceived: number
    }) => {},
  })
}
