import { getUserTeams } from "@/app/actions/team-actions";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { TeamGeneralSettings } from "@/components/settings/team-general-settings";
import { DeleteTeamButton } from "@/components/settings/delete-team-button";

interface GeneralSettingsPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function GeneralSettingsPage({
  params,
}: GeneralSettingsPageProps) {
  const resolvedParams = await params;

  const teamsResult = await getUserTeams();
  const teams = teamsResult.data ?? [];

  const currentTeam = teams.find(
    (team) => team.slug === resolvedParams.teamSlug
  );

  if (!currentTeam) {
    notFound();
  }

  const isOwner = currentTeam.role === "OWNER";
  const isAdmin = currentTeam.role === "ADMIN";
  const isMember = currentTeam.role === "MEMBER";

  // Determine if user can edit (Owner and Admin)
  const canEdit = isOwner || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">General Settings</h2>
        <p className="text-muted-foreground text-sm text-balance">
          Manage your team's general settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>
            {canEdit
              ? "Update your team's name, slug, and avatar"
              : "View your team's information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamGeneralSettings
            team={currentTeam}
            teamSlug={resolvedParams.teamSlug}
            userRole={currentTeam.role}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                <div>
                  <p className="font-medium">Delete Team</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this team and all associated data
                  </p>
                </div>
                <DeleteTeamButton
                  teamSlug={resolvedParams.teamSlug}
                  teamName={currentTeam.name}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
