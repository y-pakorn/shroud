import { useQuery } from "@tanstack/react-query"
import _ from "lodash"

import { CURRENCY } from "@/config/currency"

export const useProtocolBalances = () => {
  return {
    data: _.mapValues(CURRENCY, () => "0"),
  }
}
