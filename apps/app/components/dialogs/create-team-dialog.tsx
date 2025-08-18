"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import TeamForm from "@/components/forms/team-form";

interface CreateTeamDialogProps {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({
  children,
  open,
  onOpenChange,
}: CreateTeamDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new team</DialogTitle>
          <DialogDescription>
            Create a team to collaborate with others on projects.
          </DialogDescription>
        </DialogHeader>
        <TeamForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
