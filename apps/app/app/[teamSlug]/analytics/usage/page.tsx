import { getUserTeams } from "@/app/actions/team-actions";
import { getTeamProjects } from "@/app/actions/project-actions";
import { getUsageMetrics } from "@/app/actions/analytics-actions";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { BarChart3, TrendingUp, DollarSign, Activity } from "lucide-react";

interface UsagePageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function UsagePage({ params }: UsagePageProps) {
  const resolvedParams = await params;

  const teamsResult = await getUserTeams();
  const teams = teamsResult.data ?? [];

  const currentTeam = teams.find(
    (team) => team.slug === resolvedParams.teamSlug
  );

  if (!currentTeam) {
    notFound();
  }

  const projectsResult = await getTeamProjects(resolvedParams.teamSlug);
  const projects = projectsResult.data ?? [];

  const totalEndpoints = projects.reduce(
    (sum, project) => sum + (project._count?.endpoints || 0),
    0
  );

  // Get real usage metrics
  const usageMetricsResult = await getUsageMetrics(resolvedParams.teamSlug, 30);
  const usageMetrics = usageMetricsResult.data ?? {
    totalRequests: 0,
    avgResponseTime: 0,
    estimatedCost: 0,
    endpointBreakdown: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usage Analytics</h2>
        <p className="text-muted-foreground">
          Monitor your API usage and endpoint performance
        </p>
      </div>

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageMetrics.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Endpoints</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEndpoints}</div>
            <p className="text-xs text-muted-foreground">Deployed models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${usageMetrics.estimatedCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Charts Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Request Volume</CardTitle>
          <CardDescription>API requests over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Usage analytics will appear here once you start making API requests
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Usage</CardTitle>
          <CardDescription>Usage breakdown by endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          {usageMetrics.endpointBreakdown.length > 0 ? (
            <div className="space-y-4">
              {usageMetrics.endpointBreakdown.map((endpoint) => {
                const percentage =
                  usageMetrics.totalRequests > 0
                    ? (endpoint.requestCount / usageMetrics.totalRequests) * 100
                    : 0;
                return (
                  <div key={endpoint.endpointId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {endpoint.endpointName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {endpoint.projectName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {endpoint.requestCount.toLocaleString()} requests
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {endpoint.avgResponseTime}ms avg
                        </p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {totalEndpoints > 0
                  ? "No API requests yet. Usage data will appear once your endpoints receive requests."
                  : "No endpoints deployed yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
