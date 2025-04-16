import { env } from "@/env.mjs"

export const siteConfig = {
  name: "Shroud",
  author: "yoisha",
  description: "Trade on Sui with privacy and compliance",
  keywords: [],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "@yoisha",
  },
  twitter: "",
  favicon: "/favicon.ico",
  ogImage: `${env.NEXT_PUBLIC_APP_URL}/og.jpg`,
}
