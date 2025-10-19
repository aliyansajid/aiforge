"use client";

import { MemberList } from "./member-list";
import { InvitationList } from "./invitation-list";
import { InviteDialog } from "./invite-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";

interface TeamMembersProps {
  members: any[];
  invitations: any[];
  teamId: string;
  teamSlug: string;
  userRole: string;
}

export function TeamMembers({
  members,
  invitations,
  teamId,
  teamSlug,
  userRole,
}: TeamMembersProps) {
  const canInvite = userRole === "OWNER" || userRole === "ADMIN";
  const canManage = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Manage your team members and invitations
          </p>
        </div>

        {canInvite && <InviteDialog teamId={teamId} />}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MemberList
            members={members}
            userRole={userRole}
            canManage={canManage}
            teamSlug={teamSlug}
          />
        </TabsContent>
        <TabsContent value="invitations">
          <InvitationList
            invitations={invitations}
            canManage={canManage}
            teamId={teamId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
