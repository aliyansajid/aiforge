import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getUserTeams } from "@/app/actions/team-actions";
import { SettingsNav } from "@/components/settings/settings-nav";

interface SettingsLayoutProps {
  children: ReactNode;
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps) {
  const resolvedParams = await params;

  const teamsResult = await getUserTeams();
  const teams = teamsResult.data ?? [];

  const currentTeam = teams.find(
    (team) => team.slug === resolvedParams.teamSlug
  );

  if (!currentTeam) {
    notFound();
  }

  const canManageMembers = ["OWNER", "ADMIN"].includes(currentTeam.role);
  const canManageBilling = currentTeam.role === "OWNER";

  const navigationItems = [
    {
      name: "General",
      href: `/${resolvedParams.teamSlug}/settings/general`,
      icon: "Settings" as const,
      visible: true, // All users can view general settings
    },
    {
      name: "Members",
      href: `/${resolvedParams.teamSlug}/settings/members`,
      icon: "Users" as const,
      visible: true, // All users can view members
    },
    {
      name: "Billing",
      href: `/${resolvedParams.teamSlug}/settings/billing`,
      icon: "CreditCard" as const,
      visible: canManageBilling, // Only owners can view billing
    },
  ].filter((item) => item.visible);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your team settings and preferences
        </p>
      </div>

      <div className="flex gap-6">
        <SettingsNav items={navigationItems} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
