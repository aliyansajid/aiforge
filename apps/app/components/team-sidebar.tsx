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

interface TeamSidebarProps extends React.ComponentProps<typeof Sidebar> {
  teams: any[];
}

export function TeamSidebar({ teams, ...props }: TeamSidebarProps) {
  const { data: session } = useSession();
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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        {session?.user && (
          <NavUser
            user={{
              name: session.user.name!,
              email: session.user.email!,
              avatar: session.user.image ?? "",
            }}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
