"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { X, Mail, Clock, Copy } from "lucide-react";
import { format } from "date-fns";
import { cancelInvitation } from "@/app/actions/member-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ResendInvitationButton } from "./resend-invitation-button";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  invitedBy: string;
  createdAt: Date;
  token?: string;
}

interface InvitationsTableProps {
  invitations: Invitation[];
  teamSlug: string;
}

export function InvitationsTable({
  invitations,
  teamSlug,
}: InvitationsTableProps) {
  const router = useRouter();

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(teamSlug, invitationId);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleCopyLink = (token?: string) => {
    if (!token) {
      toast.error("Invalid invitation token");
      return;
    }

    const inviteUrl = `${window.location.origin}/invite/accept?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invitation link copied to clipboard");
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Invited By</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{invitation.email}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{invitation.role}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {invitation.invitedBy}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyLink(invitation.token)}
                  title="Copy invitation link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <ResendInvitationButton
                  teamSlug={teamSlug}
                  email={invitation.email}
                  role={invitation.role as "MEMBER" | "ADMIN"}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCancelInvitation(invitation.id)}
                  title="Cancel invitation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
