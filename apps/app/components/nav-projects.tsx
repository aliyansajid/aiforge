"use client";

import {
  Folder,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { deleteProject } from "@/app/actions/project-actions";

export function NavProjects({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (projectUrl: string) => {
    startTransition(async () => {
      try {
        // Extract projectSlug and teamSlug from URL (format: /teamSlug/projectSlug)
        const urlParts = projectUrl.split('/').filter(part => part);
        const teamSlug = urlParts[0];
        const projectSlug = urlParts[1];

        if (!teamSlug || !projectSlug) {
          toast.error("Invalid project URL");
          return;
        }

        const result = await deleteProject(projectSlug, teamSlug);

        if (result.success) {
          toast.success("Project deleted successfully");
          router.refresh();
        } else {
          toast.error(result.message || "Failed to delete project");
        }
      } catch (error) {
        toast.error("An error occurred while deleting the project");
      }
    });
  };

  // Show only first 3 projects
  const displayedProjects = projects.slice(0, 3);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {displayedProjects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem asChild>
                  <Link href={item.url}>
                    <Folder className="text-muted-foreground" />
                    <span>View Project</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(item.url)}
                  disabled={isPending}
                >
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
