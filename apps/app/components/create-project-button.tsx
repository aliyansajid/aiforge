"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Plus, PlusCircle } from "lucide-react";
import { CreateProjectDialog } from "./dialogs/create-project-dialog";

interface CreateProjectButtonProps {
  teamId: string;
}

export function CreateProjectButton({ teamId }: CreateProjectButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>
        <PlusCircle />
        Create Project
      </Button>

      <CreateProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        teamId={teamId}
      />
    </>
  );
}
