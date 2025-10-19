import { useState } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Mail, Clock, X } from "lucide-react";
import { cancelInvitation } from "@/actions/team-member-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Spinner } from "@repo/ui/components/spinner";
import { formatDistanceToNow } from "date-fns";
import { EmptyTeamMembers } from "./empty-team-members";

interface InvitationListProps {
  invitations: any[];
  canManage: boolean;
  teamId: string;
}

export function InvitationList({
  invitations,
  canManage,
  teamId,
}: InvitationListProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (invitationId: string) => {
    setCancellingId(invitationId);
    const result = await cancelInvitation(invitationId);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setCancellingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "EXPIRED":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (invitations.length === 0) {
    return <EmptyTeamMembers canInvite={canManage} teamId={teamId} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          Invitations that are waiting to be accepted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-muted">
                  <Mail className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Invited by {invitation.invitedBy}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDistanceToNow(new Date(invitation.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline">{invitation.role}</Badge>
                {getStatusBadge(invitation.status)}

                {canManage && invitation.status === "PENDING" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancel(invitation.id)}
                    disabled={cancellingId === invitation.id}
                    title="Cancel invitation"
                  >
                    {cancellingId === invitation.id ? <Spinner /> : <X />}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
