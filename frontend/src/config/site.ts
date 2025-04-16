import { env } from "@/env.mjs"

export const siteConfig = {
  name: "Next Template",
  author: "Author",
  description: "Description",
  keywords: [],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "Author",
  },
  twitter: "",
  favicon: "/favicon.ico",
  ogImage: `${env.NEXT_PUBLIC_APP_URL}/og.jpg`,
}
