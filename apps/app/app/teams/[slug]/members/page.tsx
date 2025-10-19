import { TeamMembers } from "@/components/team-members";
import {
  getTeamMembers,
  getTeamInvitations,
} from "@/actions/team-member-actions";
import { getTeamBySlug } from "@/actions/team-settings-actions";
import { redirect } from "next/navigation";

interface MembersPageProps {
  params: {
    slug: string;
  };
}

const MembersPage = async ({ params }: MembersPageProps) => {
  // Fetch team to get ID and verify access
  const teamResult = await getTeamBySlug(params.slug);

  if (!teamResult.success || !teamResult.data) {
    redirect("/");
  }

  const team = teamResult.data;

  // Fetch members and invitations in parallel
  const [membersResult, invitationsResult] = await Promise.all([
    getTeamMembers(team.id),
    getTeamInvitations(team.id),
  ]);

  if (!membersResult.success) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="text-destructive">{membersResult.message}</p>
      </div>
    );
  }

  const members = membersResult.data || [];
  const invitations = invitationsResult.success
    ? invitationsResult.data || []
    : [];
  return (
    <TeamMembers
      members={members}
      invitations={invitations}
      teamId={team.id}
      teamSlug={team.slug}
      userRole={team.role}
    />
  );
};

export default MembersPage;
