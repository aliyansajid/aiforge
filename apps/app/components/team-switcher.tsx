"use client";

import * as React from "react";
import { ChevronsUpDown, Plus, Building2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import { CreateTeamDialog } from "./dialogs/create-team-dialog";
import { useParams, useRouter } from "next/navigation";

type Team = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  role: string;
};

export function TeamSwitcher({ teams }: { teams: Team[] }) {
  const { isMobile } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Get active team from URL params
  const currentSlug = params.slug as string;
  const activeTeam = React.useMemo(() => {
    return teams.find((team) => team.slug === currentSlug) || teams[0];
  }, [teams, currentSlug]);

  // If no teams, show create team button
  if (teams.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <CreateTeamDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={() => setIsDialogOpen(true)}
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Create a team</span>
                <span className="truncate text-xs">Get started</span>
              </div>
              <Plus className="ml-auto" />
            </SidebarMenuButton>
          </CreateTeamDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!activeTeam) {
    return null;
  }

  // Get the icon component dynamically
  const ActiveIcon =
    (LucideIcons as any)[activeTeam.icon] || LucideIcons.Building2;

  const handleTeamSwitch = (team: Team) => {
    // Navigate to the team's page
    router.push(`/teams/${team.slug}`);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <ActiveIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">
                  {activeTeam.role.charAt(0).toUpperCase() +
                    activeTeam.role.slice(1).toLowerCase()}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => {
              const TeamIcon =
                (LucideIcons as any)[team.icon] || LucideIcons.Building2;

              return (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamSwitch(team)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <TeamIcon className="size-3.5 shrink-0" />
                  </div>
                  {team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={(e) => {
                e.preventDefault();
                setIsDialogOpen(true);
              }}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateTeamDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
