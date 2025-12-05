"use client";

import { LayoutDashboard, Boxes, Settings2, BarChart3 } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@repo/ui/components/sidebar";
import { useSession } from "@repo/auth/client";
import { TeamSwitcher } from "@/components/team-switcher";
import { Team, Project } from "@/types";
import { getPermissions, type TeamRole } from "@/lib/rbac";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  teams: Team[];
  currentTeamSlug: string;
  projects: Project[];
  currentUserRole?: string;
}

export function AppSidebar({
  teams,
  currentTeamSlug,
  projects,
  currentUserRole = "MEMBER",
  ...props
}: AppSidebarProps) {
  const { data: session } = useSession();

  const user = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "m@example.com",
    avatar: session?.user?.image || "https://github.com/shadcn.png",
  };

  // Get permissions based on role
  const permissions = getPermissions(currentUserRole as TeamRole);

  // Build navigation items with RBAC
  const navMain = [
    {
      title: "Dashboard",
      url: `/${currentTeamSlug}/dashboard`,
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Projects",
      url: `/${currentTeamSlug}`,
      icon: Boxes,
    },
    {
      title: "Analytics",
      url: `/${currentTeamSlug}/analytics/usage`,
      icon: BarChart3,
      items: [
        {
          title: "Usage",
          url: `/${currentTeamSlug}/analytics/usage`,
        },
        {
          title: "Performance",
          url: `/${currentTeamSlug}/analytics/performance`,
        },
      ],
    },
    {
      title: "Settings",
      url: `/${currentTeamSlug}/settings/general`,
      icon: Settings2,
      items: [
        ...(permissions.canUpdateTeamSettings
          ? [
              {
                title: "General",
                url: `/${currentTeamSlug}/settings/general`,
              },
            ]
          : []),
        ...(permissions.canInviteMembers
          ? [
              {
                title: "Team Members",
                url: `/${currentTeamSlug}/settings/members`,
              },
            ]
          : []),
        ...(permissions.canViewBilling
          ? [
              {
                title: "Billing",
                url: `/${currentTeamSlug}/settings/billing`,
              },
            ]
          : []),
      ],
    },
  ];

  // Transform projects to match NavProjects format
  const sidebarProjects = projects.map((project) => ({
    name: project.name,
    url: `/${currentTeamSlug}/${project.slug}`,
    icon: Boxes,
  }));

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} currentTeamSlug={currentTeamSlug} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={sidebarProjects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
