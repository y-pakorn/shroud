import { contracts } from "./contract"

export const CURRENCY = {
  // SUI: {
  //   id: "SUI",
  //   ticker: "SUI",
  //   name: "Sui",
  //   icon: "https://s3.coinmarketcap.com/static-gravity/image/5bd0f43855f6434386c59f2341c5aaf0.png",
  //   decimals: 9,
  //   coinType: "0x2::sui::SUI",
  //   pythId:
  //     "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  // },
  USDC: {
    id: "USDC",
    ticker: "USDC",
    name: "USD Coin",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png",
    decimals: 6,
    coinType: `${contracts.packageId}::usdc::USDC`,
    pythId:
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  },
  USDT: {
    id: "USDT",
    ticker: "USDT",
    name: "Tether",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/825.png",
    decimals: 6,
    coinType: `${contracts.packageId}::usdt::USDT`,
    pythId:
      "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  },
  BTC: {
    id: "BTC",
    ticker: "BTC",
    name: "Bitcoin",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/1.png",
    decimals: 6,
    coinType: `${contracts.packageId}::btc::BTC`,
    pythId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  },
  ETH: {
    id: "ETH",
    ticker: "ETH",
    name: "Ethereum",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/1027.png",
    decimals: 6,
    coinType: `${contracts.packageId}::eth::ETH`,
    pythId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  },
  WAL: {
    id: "WAL",
    ticker: "WAL",
    name: "Walrus",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/36119.png",
    decimals: 6,
    coinType: `${contracts.packageId}::wal::WAL`,
    pythId:
      "0xeba0732395fae9dec4bae12e52760b35fc1c5671e2da8b449c9af4efe5d54341",
  },
}

export const CURRENCY_LIST = ["USDC", "USDT", "BTC", "ETH", "WAL"] as const
