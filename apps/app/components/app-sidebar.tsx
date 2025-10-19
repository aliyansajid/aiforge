"use client";

import * as React from "react";
import { BookOpen, Bot, Settings2, SquareTerminal } from "lucide-react";
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
import { useEffect, useState } from "react";
import { getUserTeams } from "@/actions/team-actions";
import { Skeleton } from "@repo/ui/components/skeleton";

const navMain = [
  {
    title: "Playground",
    url: "#",
    icon: SquareTerminal,
    isActive: true,
    items: [
      { title: "History", url: "#" },
      { title: "Starred", url: "#" },
      { title: "Settings", url: "#" },
    ],
  },
  {
    title: "Models",
    url: "#",
    icon: Bot,
    items: [
      { title: "Genesis", url: "#" },
      { title: "Explorer", url: "#" },
      { title: "Quantum", url: "#" },
    ],
  },
  {
    title: "Documentation",
    url: "#",
    icon: BookOpen,
    items: [
      { title: "Introduction", url: "#" },
      { title: "Get Started", url: "#" },
      { title: "Tutorials", url: "#" },
      { title: "Changelog", url: "#" },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [
      { title: "General", url: "#" },
      { title: "Team", url: "#" },
      { title: "Billing", url: "#" },
      { title: "Limits", url: "#" },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      if (session?.user?.id) {
        setIsLoadingTeams(true);
        const result = await getUserTeams();
        if (result.success && result.data) {
          setTeams(result.data);
        }
        setIsLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [session]);

  // Session is loading
  const isLoadingSession = status === "loading";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {isLoadingTeams ? (
          <Skeleton className="h-12" />
        ) : (
          <TeamSwitcher teams={teams} />
        )}
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
