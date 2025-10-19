"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { updateMemberRole, removeMember } from "@/actions/team-member-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Spinner } from "@repo/ui/components/spinner";

interface MemberListProps {
  members: any[];
  userRole: string;
  canManage: boolean;
  teamSlug: string;
}

const roles = [
  {
    name: "MEMBER",
    label: "Member",
    description: "Can view and work on projects.",
  },
  {
    name: "ADMIN",
    label: "Admin",
    description: "Can manage team members and settings.",
  },
  {
    name: "OWNER",
    label: "Owner",
    description: "Admin-level access to all resources.",
  },
];

export function MemberList({ members, userRole, canManage }: MemberListProps) {
  const router = useRouter();
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setIsUpdating(true);
    const result = await updateMemberRole(memberId, newRole as any);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
      setOpenPopoverId(null);
    } else {
      toast.error(result.message);
    }
    setIsUpdating(false);
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setRemovingMember(selectedMember.id);
    const result = await removeMember(selectedMember.id);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
      setIsAlertOpen(false);
    } else {
      toast.error(result.message);
    }
    setRemovingMember(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    return roles.find((r) => r.name === role)?.label || role;
  };

  const getAvailableRoles = (memberRole: string) => {
    // Owner can't change their own role
    if (memberRole === "OWNER") {
      return [];
    }

    // If user is owner, show all roles except owner
    if (userRole === "OWNER") {
      return roles.filter((r) => r.name !== "OWNER");
    }

    // If user is admin, they can only change to MEMBER
    if (userRole === "ADMIN") {
      return roles.filter((r) => r.name === "MEMBER");
    }

    return [];
  };

  return (
    <>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Active Members</CardTitle>
          <CardDescription>
            People who are currently part of this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.map((member) => {
            const availableRoles = getAvailableRoles(member.role);
            const canChangeRole = canManage && availableRoles.length > 0;
            const canRemove = canManage && member.role !== "OWNER";

            return (
              <Item key={member.id} size="sm" className="gap-4 px-0">
                <Avatar>
                  <AvatarImage src={member.user.image} alt={member.user.name} />
                  <AvatarFallback>
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <ItemContent>
                  <ItemTitle>{member.user.name}</ItemTitle>
                  <ItemDescription>{member.user.email}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  {canChangeRole ? (
                    <Popover
                      open={openPopoverId === member.id}
                      onOpenChange={(open) =>
                        setOpenPopoverId(open ? member.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto shadow-none"
                          disabled={isUpdating}
                        >
                          {isUpdating && openPopoverId === member.id ? (
                            <Spinner />
                          ) : (
                            <>
                              {getRoleLabel(member.role)} <ChevronDown />
                            </>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Select role..." />
                          <CommandList>
                            <CommandEmpty>No roles found.</CommandEmpty>
                            <CommandGroup>
                              {availableRoles.map((role) => (
                                <CommandItem
                                  key={role.name}
                                  onSelect={() =>
                                    handleRoleChange(member.id, role.name)
                                  }
                                >
                                  <div className="flex flex-col">
                                    <p className="text-sm font-medium">
                                      {role.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {role.description}
                                    </p>
                                  </div>
                                </CommandItem>
                              ))}
                              {canRemove && (
                                <CommandItem
                                  className="text-destructive"
                                  onSelect={() => {
                                    setSelectedMember(member);
                                    setIsAlertOpen(true);
                                    setOpenPopoverId(null);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <p className="text-sm font-medium">
                                      Remove from Team
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Revoke access to all team resources
                                    </p>
                                  </div>
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto shadow-none"
                      disabled
                    >
                      {getRoleLabel(member.role)}
                    </Button>
                  )}
                </ItemActions>
              </Item>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove&nbsp;
              <span className="font-semibold">{selectedMember?.user.name}</span>
              &nbsp; from the team? They will lose access to all team resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removingMember !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingMember ? <Spinner /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
