"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  ExternalLink,
  FileJson2,
  Github,
  Hammer,
  HeartPulse,
  UploadCloud,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { publicAssetPath } from "@/lib/public-assets"

const repositoryUrl = "https://github.com/adibirzu/oci-log-analytics-detections"

export function AppSidebar() {
  const [suiteDomain, setSuiteDomain] = useState("")
  useEffect(() => {
    if (window.location.hostname.startsWith("forge.")) setSuiteDomain(window.location.hostname.slice(6))
  }, [])
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeView = searchParams.get("view")

  const menus = [
    {title: "Baseline Detection Catalog", icon: FileJson2, href: "/baseline", active: pathname === "/baseline"},
    {
      title: "Forge",
      icon: Hammer,
      href: "/forge",
      active: pathname === "/forge" && activeView !== "log-samples" && activeView !== "deployment",
    },
    {
      title: "Log Samples",
      icon: FileJson2,
      href: "/forge?view=log-samples&tab=raw",
      active: pathname === "/forge" && activeView === "log-samples",
    },
    {
      title: "Deploy to OCI",
      icon: UploadCloud,
      href: "/forge?view=deployment",
      active: pathname === "/forge" && activeView === "deployment",
    },
  ]

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={publicAssetPath("/octo-logo.png")}
            width={36}
            height={36}
            alt="OCTO"
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">OCL Forge</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {menus.map((menu) => (
          <SidebarMenuItem key={menu.href}>
            <SidebarMenuButton asChild size="lg" tooltip={menu.title} isActive={menu.active}>
              <Link href={menu.href}>
                <menu.icon className="size-5" />
                <span className="group-data-[collapsible=icon]:hidden">{menu.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="lg" tooltip="Repository">
            <a href={repositoryUrl} target="_blank" rel="noreferrer">
              <Github className="size-5" />
              <span className="group-data-[collapsible=icon]:hidden flex-1">Repository</span>
              <ExternalLink className="size-4 group-data-[collapsible=icon]:hidden" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarContent>
      {suiteDomain && <div className="px-4 pb-3 text-xs space-y-2">
        <div className="font-semibold">Security suite</div>
        {[["cp", "/detections", "Control Plane Detections"], ["observeai", "", "ObserveAI"], ["guardian", "", "Guardian"], ["compliance", "", "Compliance"], ["coordinator", "", "Coordinator"]].map(([app, path, title]) => <a className="block underline" key={app} href={`https://${app}.${suiteDomain}${path}`}>{title}</a>)}
      </div>}
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
          <div className="flex items-center gap-2 p-2 rounded-md bg-card">
            <HeartPulse className="text-logan-success size-5" />
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium">OCI LA Scope</p>
              <p className="text-xs text-muted-foreground">Queries and dashboards</p>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
