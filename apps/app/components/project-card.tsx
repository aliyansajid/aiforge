// apps/app/components/project-card.tsx
"use client";

import { Project } from "@/types";
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useState, useTransition } from "react";
import { deleteProject } from "@/app/actions/project-actions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  teamSlug: string;
}

export function ProjectCard({ project, teamSlug }: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteProject(project.id, teamSlug);

        if (result.success) {
          toast.success(result.message);
          setShowDeleteDialog(false);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Failed to delete project.");
      }
    });
  };

  return (
    <>
      <Card className="group relative hover:shadow-md transition-shadow">
        <Link href={`/${teamSlug}/${project.slug}`}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground">{project.slug}</p>
            </div>
          </CardHeader>
        </Link>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{project.name}". This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
