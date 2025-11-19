import { getUserTeams } from "@/app/actions/team-actions";
import { getTeamProjects } from "@/app/actions/project-actions";
import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/ui/src/components/alert";

interface BillingPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const resolvedParams = await params;

  const teamsResult = await getUserTeams();
  const teams = teamsResult.data ?? [];

  const currentTeam = teams.find(
    (team) => team.slug === resolvedParams.teamSlug
  );

  if (!currentTeam) {
    notFound();
  }

  // Only owners can access billing
  if (currentTeam.role !== "OWNER") {
    redirect(`/${resolvedParams.teamSlug}`);
  }

  const projectsResult = await getTeamProjects(resolvedParams.teamSlug);
  const projects = projectsResult.data ?? [];

  const totalEndpoints = projects.reduce(
    (sum, project) => sum + (project._count?.endpoints || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Billing & Usage</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Manage your team's billing and monitor usage
        </p>
      </div>

      <Alert variant="default">
        <AlertCircle />
        <AlertTitle>Beta Pricing</AlertTitle>
        <AlertDescription>
          AIForge is currently in beta. All features are free during this
          period. Paid plans will be introduced soon.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your team's subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Beta Plan</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Free during beta period
                </p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Endpoints</p>
                <p className="text-2xl font-bold">{totalEndpoints}</p>
                <p className="text-xs text-muted-foreground">Unlimited</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">API Requests</p>
                <p className="text-2xl font-bold">∞</p>
                <p className="text-xs text-muted-foreground">Unlimited</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">∞</p>
                <p className="text-xs text-muted-foreground">Unlimited</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>Current billing period usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Total Cost</p>
              </div>
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-xs text-muted-foreground">Beta pricing</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">API Requests</p>
              </div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Compute Hours</p>
              </div>
              <p className="text-2xl font-bold">0h</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Period</p>
              </div>
              <p className="text-sm font-medium">
                {new Date().toLocaleDateString("en-US", { month: "long" })}
              </p>
              <p className="text-xs text-muted-foreground">Current month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">No payment method required</p>
            <p className="text-sm text-muted-foreground mt-1">
              Payment methods will be available when paid plans launch
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No billing history available
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
