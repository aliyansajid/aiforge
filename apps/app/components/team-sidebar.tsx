"use client";

import * as React from "react";
import {
  Settings2,
  FolderKanban,
  Users,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@repo/ui/components/sidebar";
import { useSession } from "@repo/auth";
import { useParams } from "next/navigation";
import { Skeleton } from "@repo/ui/components/skeleton";

interface TeamSidebarProps extends React.ComponentProps<typeof Sidebar> {
  teams: any[];
}

export function TeamSidebar({ teams, ...props }: TeamSidebarProps) {
  const { data: session, status } = useSession();
  const params = useParams();
  const teamSlug = params.slug as string;

  const navMain = [
    {
      title: "Projects",
      url: `/teams/${teamSlug}/projects`,
      icon: FolderKanban,
      isActive: true,
    },
    {
      title: "Members",
      url: `/teams/${teamSlug}/members`,
      icon: Users,
    },
    {
      title: "Billing",
      url: `/teams/${teamSlug}/billing`,
      icon: CreditCard,
    },
    {
      title: "Usage",
      url: `/teams/${teamSlug}/usage`,
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: `/teams/${teamSlug}/settings`,
      icon: Settings2,
    },
  ];

  // Session is loading
  const isLoadingSession = status === "loading";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        {isLoadingSession ? (
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          </div>
        ) : session?.user ? (
          <NavUser
            user={{
              name: session.user.name || "Guest User",
              email: session.user.email || "guest@example.com",
              avatar: session.user.image ?? "",
            }}
          />
        ) : (
          <NavUser
            user={{
              name: "Guest User",
              email: "Not signed in",
              avatar: "",
            }}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
