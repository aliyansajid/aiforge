"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { MoreHorizontal, Shield, ShieldCheck, Crown } from "lucide-react";
import { format } from "date-fns";
import { updateMemberRole, removeMember } from "@/app/actions/member-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { canManageRole, type TeamRole } from "@/lib/rbac";

interface Member {
  id: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface MembersTableProps {
  members: Member[];
  currentUserId: string;
  canManage: boolean;
  teamSlug: string;
  currentUserRole?: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case "OWNER":
      return <Crown className="h-4 w-4" />;
    case "ADMIN":
      return <ShieldCheck className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "OWNER":
      return "default";
    case "ADMIN":
      return "secondary";
    default:
      return "outline";
  }
};

export function MembersTable({
  members,
  currentUserId,
  canManage,
  teamSlug,
  currentUserRole = "MEMBER",
}: MembersTableProps) {
  const router = useRouter();

  const handleUpdateRole = async (memberId: string, newRole: "MEMBER" | "ADMIN") => {
    const result = await updateMemberRole(teamSlug, memberId, newRole);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    const result = await removeMember(teamSlug, memberId);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user.image || undefined} />
                  <AvatarFallback>
                    {member.user.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{member.user.name}</span>
                  <span className="text-muted-foreground text-xs">{member.user.email}</span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                {getRoleIcon(member.role)}
                {member.role}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {format(new Date(member.createdAt), "MMM d, yyyy")}
            </TableCell>
            {canManage && (
              <TableCell className="text-right">
                {member.role !== "OWNER" &&
                 canManageRole(
                   currentUserRole as TeamRole,
                   member.role as TeamRole,
                   "remove"
                 ) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canManageRole(
                        currentUserRole as TeamRole,
                        member.role as TeamRole,
                        "changeRole"
                      ) && (
                        <>
                          {member.role === "ADMIN" ? (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.id, "MEMBER")}
                            >
                              Change to Member
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.id, "ADMIN")}
                            >
                              Change to Admin
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove from team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
