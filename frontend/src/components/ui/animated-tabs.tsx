"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const tabsListRef = useRef<HTMLDivElement | null>(null)

  const updateIndicator = React.useCallback(() => {
    if (!tabsListRef.current) return

    const activeTab = tabsListRef.current.querySelector<HTMLElement>(
      '[data-state="active"]'
    )
    if (!activeTab) return

    const activeRect = activeTab.getBoundingClientRect()
    const tabsRect = tabsListRef.current.getBoundingClientRect()

    requestAnimationFrame(() => {
      setIndicatorStyle({
        left: activeRect.left - tabsRect.left,
        top: activeRect.top - tabsRect.top,
        width: activeRect.width,
        height: activeRect.height,
      })
    })
  }, [])

  useEffect(() => {
    // Initial update
    const timeoutId = setTimeout(updateIndicator, 0)

    // Event listeners
    window.addEventListener("resize", updateIndicator)
    const observer = new MutationObserver(updateIndicator)

    if (tabsListRef.current) {
      observer.observe(tabsListRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      })
    }

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener("resize", updateIndicator)
      observer.disconnect()
    }
  }, [updateIndicator])

  return (
    <div className="relative" ref={tabsListRef}>
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          "bg-muted/25 text-muted-foreground relative inline-flex items-center justify-center rounded-md border p-[3px]",
          className
        )}
        {...props}
      />
      <div
        className="bg-background/25 absolute rounded-md shadow-sm transition-all duration-300 ease-in-out"
        style={indicatorStyle}
      />
    </div>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "ring-offset-background focus-visible:ring-ring data-[state=active]:text-foreground z-10 inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
