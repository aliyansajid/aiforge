"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";

const gradients = [
  "bg-gradient-to-tl from-red-500/80 via-pink-500/80 to-purple-500/80",
  "bg-gradient-to-tr from-blue-500/80 via-cyan-500/80 to-teal-500/80",
  "bg-gradient-to-bl from-green-500/80 via-lime-500/80 to-yellow-500/80",
  "bg-gradient-to-br from-purple-500/80 via-fuchsia-500/80 to-pink-500/80",
  "bg-gradient-to-tl from-orange-500/80 via-amber-500/80 to-yellow-500/80",
];

interface TeamSwitcherProps {
  teams: {
    name: string;
    slug: string;
    role: string;
    image?: string | null;
  }[];
  currentTeamSlug?: string;
}

export function TeamSwitcher({ teams, currentTeamSlug }: TeamSwitcherProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [activeTeam, setActiveTeam] = React.useState(
    teams.find((t) => t.slug === currentTeamSlug) || teams[0]
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Keyboard shortcuts for team switching
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux) + number key
      if ((event.metaKey || event.ctrlKey) && event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        const index = parseInt(event.key) - 1;

        if (index < teams.length) {
          const team = teams[index];
          if (team) {
            setActiveTeam(team);
            router.push(`/${team.slug}`);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [teams, router]);

  if (!activeTeam) {
    return null;
  }

  const getGradient = (name: string) => {
    const hash = name.charCodeAt(0) % 5;
    return gradients[hash];
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {activeTeam.image ? (
                <div className="relative flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg">
                  <Image
                    src={activeTeam.image}
                    alt={`${activeTeam.name} logo`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className={`flex aspect-square size-8 items-center justify-center rounded-lg text-white font-semibold text-sm ${getGradient(activeTeam.name)}`}>
                  {getInitial(activeTeam.name)}
                </div>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
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
                key={team.slug}
                onClick={() => {
                  setActiveTeam(team);
                  router.push(`/${team.slug}`);
                }}
                className="gap-2 p-2"
              >
                {team.image ? (
                  <div className="relative flex size-6 items-center justify-center overflow-hidden rounded-md">
                    <Image
                      src={team.image}
                      alt={`${team.name} logo`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className={`flex size-6 items-center justify-center rounded-md text-white font-semibold text-xs ${getGradient(team.name)}`}>
                    {getInitial(team.name)}
                  </div>
                )}
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={() => setIsCreateDialogOpen(true)}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </SidebarMenu>
  );
}
