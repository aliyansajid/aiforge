"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Team } from "@/types";
import { updateTeamSettings } from "@/app/actions/team-actions";

interface TeamGeneralSettingsProps {
  team: Team;
  teamSlug: string;
  userRole: string;
  canEdit: boolean;
}

export function TeamGeneralSettings({
  team,
  teamSlug,
  userRole,
  canEdit,
}: TeamGeneralSettingsProps) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(team.name);
  const [teamSlugState, setTeamSlugState] = useState(team.slug);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    team.image || null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("You don't have permission to edit team settings");
      return;
    }

    setIsLoading(true);

    const result = await updateTeamSettings({
      teamSlug,
      name: teamName,
      slug: teamSlugState,
      avatarFile,
    });

    setIsLoading(false);

    if (result.success) {
      toast.success(result.message);

      // If slug changed, redirect to new URL
      if (teamSlugState !== team.slug && result.data?.slug) {
        router.push(`/${result.data.slug}/settings/general`);
      } else {
        router.refresh();
      }
    } else {
      toast.error(result.message);
    }
  };

  const hasChanges =
    teamName !== team.name ||
    teamSlugState !== team.slug ||
    avatarFile !== null;

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarPreview || undefined} />
          <AvatarFallback className="text-2xl">
            {teamName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Label>Team Avatar</Label>
          <div className="flex items-center gap-2">
            {canEdit ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners and admins can update the team avatar
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Team Name */}
      <div className="space-y-2">
        <Label htmlFor="team-name">Team Name</Label>
        <Input
          id="team-name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter team name"
          disabled={!canEdit}
        />
        <p className="text-xs text-muted-foreground">
          This is your team's display name across the platform
        </p>
      </div>

      {/* Team Slug */}
      <div className="space-y-2">
        <Label htmlFor="team-slug">Team Slug</Label>
        <Input
          id="team-slug"
          value={teamSlugState}
          onChange={(e) =>
            setTeamSlugState(e.target.value.toLowerCase().replace(/\s+/g, "-"))
          }
          placeholder="team-slug"
          disabled={!canEdit}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          {canEdit
            ? "Used in URLs. Changing this will affect all project links."
            : "Your team's unique identifier in URLs"}
        </p>
      </div>

      {/* Team ID (Read-only) */}
      <div className="space-y-2">
        <Label htmlFor="team-id">Team ID</Label>
        <Input
          id="team-id"
          value={team.id}
          disabled
          className="bg-muted font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Your team's unique identifier (read-only)
        </p>
      </div>

      {/* Save Button */}
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          {hasChanges && (
            <p className="text-sm text-muted-foreground">
              You have unsaved changes
            </p>
          )}
        </div>
      )}

      {!canEdit && (
        <div className="rounded-lg border bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            You have <strong>view-only</strong> access to team settings.
            {userRole === "MEMBER" &&
              " Contact a team owner or admin to make changes."}
          </p>
        </div>
      )}
    </div>
  );
}
