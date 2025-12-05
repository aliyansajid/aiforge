import { getUserTeams } from "@/app/actions/team-actions";
import { getTeamProjects } from "@/app/actions/project-actions";
import {
  getUsageMetrics,
  getRequestVolumeData,
  getInfrastructureMetrics,
} from "@/app/actions/analytics-actions";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Activity,
  Cpu,
  Server,
  MemoryStick,
} from "lucide-react";
import { RequestVolumeChart } from "@/components/analytics/request-volume-chart";

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

  // Get request volume time-series data
  const requestVolumeResult = await getRequestVolumeData(
    resolvedParams.teamSlug,
    24
  );
  const requestVolumeData = requestVolumeResult.data ?? {
    timeSeries: [],
    totalRequests: 0,
  };

  console.log("[Usage Page] Request volume data:", {
    success: requestVolumeResult.success,
    dataPoints: requestVolumeData.timeSeries.length,
    totalRequests: requestVolumeData.totalRequests,
    firstPoint: requestVolumeData.timeSeries[0],
  });

  // Get infrastructure metrics
  const infrastructureResult = await getInfrastructureMetrics(
    resolvedParams.teamSlug,
    1
  );
  const infrastructure = infrastructureResult.data ?? {
    cpuUtilization: 0,
    memoryUtilization: 0,
    activeInstances: 0,
    totalInstances: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Usage Analytics</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Monitor your API usage and endpoint performance
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Active Endpoints
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEndpoints}</div>
            <p className="text-xs text-muted-foreground">Deployed models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageMetrics.avgResponseTime}ms
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Estimated Cost
            </CardTitle>
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

      <RequestVolumeChart data={requestVolumeData.timeSeries} />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Cloud Run Infrastructure</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                CPU Utilization
              </CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {infrastructure.cpuUtilization}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average across all instances
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Memory Utilization
              </CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {infrastructure.memoryUtilization}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average across all instances
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Active Instances
              </CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {infrastructure.activeInstances}
              </div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Total Services
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {infrastructure.totalInstances}
              </div>
              <p className="text-xs text-muted-foreground">
                Deployed endpoints
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint Usage</CardTitle>
          <CardDescription>Usage breakdown by endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          {usageMetrics.endpointBreakdown.length > 0 ? (
            <div className="space-y-3">
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
