"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/src/components/spinner";

interface DeleteTeamButtonProps {
  teamSlug: string;
  teamName: string;
}

export function DeleteTeamButton({
  teamSlug,
  teamName,
}: DeleteTeamButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== teamName) {
      toast.error("Team name doesn't match");
      return;
    }

    setIsDeleting(true);

    // TODO: Implement deleteTeam action
    // const result = await deleteTeam(teamSlug);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsDeleting(false);
    toast.error("Team deletion is not yet implemented");
    setOpen(false);
    setConfirmText("");

    // When implemented:
    // if (result.success) {
    //   toast.success("Team deleted successfully");
    //   router.push("/");
    // } else {
    //   toast.error(result.message);
    // }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Team</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete Team</DialogTitle>

          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            team&nbsp;
            <strong>{teamName}</strong> and remove all associated data
            including:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-text">
            To confirm, type<b className="font-semibold">"{teamName}"</b>
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={teamName}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setConfirmText("");
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== teamName || isDeleting}
          >
            {isDeleting ? <Spinner /> : "Delete Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
