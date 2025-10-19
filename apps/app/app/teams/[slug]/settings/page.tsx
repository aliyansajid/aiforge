"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { InputGroupButton } from "@repo/ui/components/input-group";
import * as LucideIcons from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Label } from "@repo/ui/components/label";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { IconPicker } from "@/components/icon-picker";
import { Avatar } from "@repo/ui/components/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Separator } from "@repo/ui/components/separator";
import { Badge } from "@repo/ui/components/badge";
import { useParams } from "next/navigation";
import {
  getTeamBySlug,
  updateTeamName,
  updateTeamIcon,
  deleteTeam,
} from "@/actions/team-settings-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Spinner } from "@repo/ui/components/spinner";

const General = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [openNameDialog, setOpenNameDialog] = useState(false);
  const [openIconDialog, setOpenIconDialog] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const TeamIcon = (LucideIcons as any)[icon] || LucideIcons.Building2;
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  useEffect(() => {
    const fetchTeam = async () => {
      const result = await getTeamBySlug(slug);
      if (result.success && result.data) {
        setTeam(result.data);
        setName(result.data.name);
        setIcon(result.data.icon);
        setTempName(result.data.name);
      } else {
        toast.error(result.message);
        router.push("/");
      }
      setLoading(false);
    };

    fetchTeam();
  }, [slug, router]);

  const handleUpdateName = async () => {
    if (!tempName.trim()) return;

    setIsUpdating(true);
    const result = await updateTeamName(team.id, tempName);

    if (result.success) {
      setName(tempName);
      toast.success(result.message);
      setOpenNameDialog(false);
    } else {
      toast.error(result.message);
    }
    setIsUpdating(false);
  };

  const handleUpdateIcon = async (newIcon: string) => {
    setIsUpdating(true);
    const result = await updateTeamIcon(team.id, newIcon);

    if (result.success) {
      setIcon(newIcon);
      toast.success(result.message);
      setOpenIconDialog(false);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsUpdating(false);
  };

  const handleDeleteTeam = async () => {
    setIsDeleting(true);
    const result = await deleteTeam(team.id);

    if (result.success) {
      toast.success(result.message);
      router.push("/");
    } else {
      toast.error(result.message);
    }
    setIsDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const canEdit = team.role === "OWNER" || team.role === "ADMIN";
  const canDelete = team.role === "OWNER";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Manage your team settings and invitations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>Basic information about your team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-3">
              <Label>Team Name</Label>
              <p>{name}</p>
            </div>

            {canEdit && (
              <Dialog open={openNameDialog} onOpenChange={setOpenNameDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setTempName(name)}>
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Update Team Name</DialogTitle>
                    <DialogDescription>
                      Enter a new name for your team
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="e.g. My Awesome Team"
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpenNameDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateName}
                      disabled={!tempName.trim() || isUpdating}
                    >
                      {isUpdating ? <Spinner /> : "Update"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <Label>Team ID</Label>
            <div className="flex gap-1">
              <Badge>{team.id}</Badge>
              <InputGroupButton
                aria-label="Copy Team ID"
                title="Copy Team ID"
                size="icon-xs"
                onClick={() => {
                  copyToClipboard(team.id);
                }}
              >
                {isCopied ? <LucideIcons.Check /> : <LucideIcons.Copy />}
              </InputGroupButton>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="flex items-center justify-center size-16 bg-primary text-primary-foreground">
                <TeamIcon className="size-8" />
              </Avatar>
              <div className="flex flex-col gap-1">
                <Label>Team Icon</Label>
                <p className="text-muted-foreground text-sm">{icon}</p>
              </div>
            </div>

            {canEdit && (
              <Dialog open={openIconDialog} onOpenChange={setOpenIconDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">Update</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Update Team Icon</DialogTitle>
                    <DialogDescription>
                      Choose a new icon for your team
                    </DialogDescription>
                  </DialogHeader>
                  <IconPicker
                    value={icon}
                    onSelect={(newIcon) => handleUpdateIcon(newIcon)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <Label>Team Role</Label>
            <Badge variant="secondary">{team.role}</Badge>
          </div>
        </CardContent>
      </Card>

      {canDelete && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Team</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the team and remove all associated data including projects,
                    members, and settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTeam}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? <Spinner /> : "Delete Team"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default General;
