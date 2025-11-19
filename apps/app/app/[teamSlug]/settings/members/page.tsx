import {
  getTeamMembers,
  getTeamInvitations,
} from "@/app/actions/member-actions";
import { getUserTeams } from "@/app/actions/team-actions";
import { notFound } from "next/navigation";
import { MembersTable } from "@/components/members/members-table";
import { InvitationsTable } from "@/components/members/invitations-table";
import { InviteMemberButton } from "@/components/members/invite-member-button";
import { RolePermissionsInfo } from "@/components/members/role-permissions-info";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";

interface TeamMembersPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function TeamMembersPage({
  params,
}: TeamMembersPageProps) {
  const resolvedParams = await params;

  const teamsResult = await getUserTeams();
  const teams = teamsResult.data ?? [];

  const currentTeam = teams.find(
    (team) => team.slug === resolvedParams.teamSlug
  );

  if (!currentTeam) {
    notFound();
  }

  const membersResult = await getTeamMembers(resolvedParams.teamSlug);
  const members = membersResult.data ?? [];

  const invitationsResult = await getTeamInvitations(resolvedParams.teamSlug);
  const invitations = invitationsResult.data ?? [];

  const canManageMembers = ["OWNER", "ADMIN"].includes(currentTeam.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Members</h2>
          <p className="text-muted-foreground text-sm">
            Manage team members and invitations for {currentTeam.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RolePermissionsInfo />
          {canManageMembers && (
            <InviteMemberButton teamSlug={resolvedParams.teamSlug} />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "member" : "members"} in
            this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable
            members={members}
            currentUserId={currentTeam.id}
            canManage={canManageMembers}
            teamSlug={resolvedParams.teamSlug}
            currentUserRole={currentTeam.role}
          />
        </CardContent>
      </Card>

      {canManageMembers && invitations.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                {invitations.length} pending{" "}
                {invitations.length === 1 ? "invitation" : "invitations"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationsTable
                invitations={invitations}
                teamSlug={resolvedParams.teamSlug}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
