export const CURRENCY = {
  SUI: {
    id: "SUI",
    ticker: "SUI",
    name: "Sui",
    icon: "https://s3.coinmarketcap.com/static-gravity/image/5bd0f43855f6434386c59f2341c5aaf0.png",
    decimals: 9,
    coinType: "0x2::sui::SUI",
    pythId:
      "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  },
  USDC: {
    id: "USDC",
    ticker: "USDC",
    name: "USD Coin",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png",
    decimals: 6,
    coinType:
      "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
    pythId:
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  },
  WAL: {
    id: "WAL",
    ticker: "WAL",
    name: "Walrus",
    icon: "https://strapi-dev.scand.app/uploads/WAL_4720dc612f.png",
    decimals: 9,
    coinType:
      "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
    pythId:
      "0xeba0732395fae9dec4bae12e52760b35fc1c5671e2da8b449c9af4efe5d54341",
  },
  BNB: {
    id: "BNB",
    ticker: "BNB",
    name: "Binance Coin",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/1839.png",
    decimals: 9,
    coinType:
      "0x700de8dea1aac1de7531e9d20fc2568b12d74369f91b7fad3abc1c4f40396e52::bnb::BNB",
    pythId:
      "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  },
  BTC: {
    id: "BTC",
    ticker: "BTC",
    name: "Bitcoin",
    icon: "https://s2.coinmarketcap.com/static/img/coins/200x200/1.png",
    decimals: 9,
    coinType:
      "0x700de8dea1aac1de7531e9d20fc2568b12d74369f91b7fad3abc1c4f40396e52::btc::BTC",
    pythId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  },
}

export const CURRENCY_LIST = ["SUI", "USDC", "WAL", "BNB", "BTC"] as const
