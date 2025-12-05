"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Info, Check, X } from "lucide-react";
import { getPermissions, getRoleDescription, type TeamRole } from "@/lib/rbac";

export function RolePermissionsInfo() {
  const roles: TeamRole[] = ["OWNER", "ADMIN", "MEMBER"];

  const permissionLabels: { [key: string]: string } = {
    canUpdateTeamSettings: "Update team settings",
    canDeleteTeam: "Delete team",
    canTransferOwnership: "Transfer ownership",
    canInviteMembers: "Invite members",
    canRemoveMembers: "Remove members",
    canUpdateMemberRoles: "Update member roles",
    canManageInvitations: "Manage invitations",
    canCreateProjects: "Create projects",
    canDeleteProjects: "Delete projects",
    canUpdateProjectSettings: "Update project settings",
    canCreateEndpoints: "Create endpoints",
    canDeleteEndpoints: "Delete endpoints",
    canUpdateEndpoints: "Update endpoints",
    canViewEndpointLogs: "View endpoint logs",
    canViewEndpointMetrics: "View endpoint metrics",
    canViewBilling: "View billing",
    canUpdateBilling: "Update billing",
    canViewUsageMetrics: "View usage metrics",
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info />
          Role Permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Role Permissions Guide</DialogTitle>
          <DialogDescription>
            Understand what each role can do in your team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {roles.map((role) => {
            const permissions = getPermissions(role);
            const description = getRoleDescription(role);

            return (
              <div key={role} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      role === "OWNER"
                        ? "default"
                        : role === "ADMIN"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {role}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                <div className="grid gap-2 rounded-lg border p-4">
                  {Object.entries(permissions).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {permissionLabels[key] || key}
                      </span>
                      {value ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Team owners have full control over all team
            resources. Admins can manage members and projects but cannot modify
            team settings or billing. Members have limited permissions focused
            on creating and managing their own endpoints.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
