/**
 * Role-Based Access Control (RBAC) utilities
 *
 * This module defines permissions and access control for team members
 * based on their roles (OWNER, ADMIN, MEMBER)
 */

export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Permission {
  // Team Management
  canUpdateTeamSettings: boolean;
  canDeleteTeam: boolean;
  canTransferOwnership: boolean;

  // Member Management
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canUpdateMemberRoles: boolean;
  canManageInvitations: boolean;

  // Project Management
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
  canUpdateProjectSettings: boolean;

  // Endpoint Management
  canCreateEndpoints: boolean;
  canDeleteEndpoints: boolean;
  canUpdateEndpoints: boolean;
  canViewEndpointLogs: boolean;
  canViewEndpointMetrics: boolean;

  // Billing & Usage
  canViewBilling: boolean;
  canUpdateBilling: boolean;
  canViewUsageMetrics: boolean;
}

/**
 * Get permissions based on team role
 */
export function getPermissions(role: TeamRole): Permission {
  switch (role) {
    case "OWNER":
      return {
        // Team Management
        canUpdateTeamSettings: true,
        canDeleteTeam: true,
        canTransferOwnership: true,

        // Member Management
        canInviteMembers: true,
        canRemoveMembers: true,
        canUpdateMemberRoles: true,
        canManageInvitations: true,

        // Project Management
        canCreateProjects: true,
        canDeleteProjects: true,
        canUpdateProjectSettings: true,

        // Endpoint Management
        canCreateEndpoints: true,
        canDeleteEndpoints: true,
        canUpdateEndpoints: true,
        canViewEndpointLogs: true,
        canViewEndpointMetrics: true,

        // Billing & Usage
        canViewBilling: true,
        canUpdateBilling: true,
        canViewUsageMetrics: true,
      };

    case "ADMIN":
      return {
        // Team Management
        canUpdateTeamSettings: false,
        canDeleteTeam: false,
        canTransferOwnership: false,

        // Member Management
        canInviteMembers: true,
        canRemoveMembers: true, // Can only remove members, not admins or owner
        canUpdateMemberRoles: false, // Only owner can change roles
        canManageInvitations: true,

        // Project Management
        canCreateProjects: true,
        canDeleteProjects: true,
        canUpdateProjectSettings: true,

        // Endpoint Management
        canCreateEndpoints: true,
        canDeleteEndpoints: true,
        canUpdateEndpoints: true,
        canViewEndpointLogs: true,
        canViewEndpointMetrics: true,

        // Billing & Usage
        canViewBilling: true,
        canUpdateBilling: false,
        canViewUsageMetrics: true,
      };

    case "MEMBER":
      return {
        // Team Management
        canUpdateTeamSettings: false,
        canDeleteTeam: false,
        canTransferOwnership: false,

        // Member Management
        canInviteMembers: false,
        canRemoveMembers: false,
        canUpdateMemberRoles: false,
        canManageInvitations: false,

        // Project Management
        canCreateProjects: true,
        canDeleteProjects: false,
        canUpdateProjectSettings: false,

        // Endpoint Management
        canCreateEndpoints: true,
        canDeleteEndpoints: false,
        canUpdateEndpoints: true, // Can update their own endpoints
        canViewEndpointLogs: true,
        canViewEndpointMetrics: true,

        // Billing & Usage
        canViewBilling: false,
        canUpdateBilling: false,
        canViewUsageMetrics: true,
      };
  }
}

/**
 * Check if a role can perform an action on a target role
 */
export function canManageRole(
  currentRole: TeamRole,
  targetRole: TeamRole,
  action: "remove" | "changeRole"
): boolean {
  // Owner cannot be managed
  if (targetRole === "OWNER") {
    return false;
  }

  // Only owner can change roles
  if (action === "changeRole") {
    return currentRole === "OWNER";
  }

  // For removal
  if (action === "remove") {
    // Owner can remove anyone (except OWNER, which is already handled above)
    if (currentRole === "OWNER") {
      return true;
    }

    // Admin can only remove members, not other admins
    if (currentRole === "ADMIN") {
      return targetRole === "MEMBER";
    }

    // Members cannot remove anyone
    return false;
  }

  return false;
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: TeamRole): number {
  switch (role) {
    case "OWNER":
      return 3;
    case "ADMIN":
      return 2;
    case "MEMBER":
      return 1;
    default:
      return 0;
  }
}

/**
 * Check if one role has higher privileges than another
 */
export function hasHigherRole(role1: TeamRole, role2: TeamRole): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2);
}

/**
 * Get available roles that can be assigned by current role
 */
export function getAssignableRoles(currentRole: TeamRole): TeamRole[] {
  switch (currentRole) {
    case "OWNER":
      return ["ADMIN", "MEMBER"];
    case "ADMIN":
      return []; // Admins cannot assign roles
    case "MEMBER":
      return []; // Members cannot assign roles
  }
}

/**
 * Get role description
 */
export function getRoleDescription(role: TeamRole): string {
  switch (role) {
    case "OWNER":
      return "Full access to all team resources and settings. Can manage billing, transfer ownership, and perform all actions.";
    case "ADMIN":
      return "Can manage team members, projects, and endpoints. Cannot modify team settings or billing.";
    case "MEMBER":
      return "Can create and manage their own endpoints. Limited access to team management features.";
  }
}

/**
 * Validate if a user can perform a specific action
 */
export function validateAction(
  role: TeamRole,
  action: keyof Permission
): boolean {
  const permissions = getPermissions(role);
  return permissions[action];
}
