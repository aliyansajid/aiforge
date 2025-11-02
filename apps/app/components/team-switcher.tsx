"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
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
import { useState } from "react";
import { CreateTeamDialog } from "./dialogs/create-team-dialog";
import { TeamAvatar } from "@/components/team-avatar";
import { Team } from "@/types";
import { useRouter } from "next/navigation";

interface TeamSwitcherProps {
  teams: Team[];
  currentTeamSlug: string;
}

export function TeamSwitcher({ teams, currentTeamSlug }: TeamSwitcherProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const activeTeam = teams.find((team) => team.slug === currentTeamSlug);

  const handleTeamSwitch = (teamSlug: string) => {
    router.push(`/${teamSlug}`);
  };

  if (!activeTeam) {
    return null;
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <TeamAvatar
                  image={activeTeam.image}
                  name={activeTeam.name}
                  size="md"
                  className="rounded-lg"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeTeam.name}
                  </span>
                  <span className="truncate text-xs">{activeTeam.role}</span>
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
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamSwitch(team.slug)}
                  className="gap-2 p-2"
                >
                  <TeamAvatar
                    image={team.image}
                    name={team.name}
                    size="sm"
                    className="rounded-md"
                  />
                  {team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Add team
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
}
