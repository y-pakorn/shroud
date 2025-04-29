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
    faucetAmount: 1000,
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
    faucetAmount: 1000,
  },
  HASUI: {
    id: "HASUI",
    ticker: "haSUI",
    name: "Haedal Staked SUI",
    icon: "https://assets.haedal.xyz/logos/hasui.svg",
    decimals: 6,
    coinType: `${contracts.packageId}::hasui::HASUI`,
    pythId:
      "0x6120ffcf96395c70aa77e72dcb900bf9d40dccab228efca59a17b90ce423d5e8",
    faucetAmount: 250,
  },
  SUINS: {
    id: "SUINS",
    ticker: "SuiNS",
    name: "SUI Name Service",
    icon: "https://token-image.suins.io/icon.svg",
    decimals: 6,
    coinType: `${contracts.packageId}::suins::SUINS`,
    pythId:
      "0xbb5ff26e47a3a6cc7ec2fce1db996c2a145300edc5acaabe43bf9ff7c5dd5d32",
    faucetAmount: 10000,
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
    faucetAmount: 100,
  },
}

export const CURRENCY_LIST = ["USDC", "USDT", "HASUI", "SUINS", "WAL"] as const
