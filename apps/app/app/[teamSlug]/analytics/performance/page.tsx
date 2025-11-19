import { getUserTeams } from "@/app/actions/team-actions";
import { getTeamProjects } from "@/app/actions/project-actions";
import { getPerformanceMetrics } from "@/app/actions/analytics-actions";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Zap, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";

interface PerformancePageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function PerformancePage({
  params,
}: PerformancePageProps) {
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

  // Get real performance metrics
  const performanceMetricsResult = await getPerformanceMetrics(
    resolvedParams.teamSlug,
    24
  );
  const performanceMetrics = performanceMetricsResult.data ?? {
    uptime: 100,
    avgLatency: 0,
    p95Latency: 0,
    errorRate: 0,
    endpointHealth: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Performance Analytics</h2>
        <p className="text-muted-foreground">
          Monitor endpoint performance and reliability
        </p>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.uptime.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Latency
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.avgLatency}ms
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P95 Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.p95Latency}ms
            </div>
            <p className="text-xs text-muted-foreground">95th percentile</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.errorRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Trends</CardTitle>
          <CardDescription>Average response time over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Performance metrics will appear here once you start making API requests
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint Health */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Health</CardTitle>
          <CardDescription>Status of all deployed endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceMetrics.endpointHealth.length > 0 ? (
            <div className="space-y-4">
              {performanceMetrics.endpointHealth.map((endpoint) => {
                const getStatusIcon = () => {
                  switch (endpoint.status) {
                    case "healthy":
                      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
                    case "degraded":
                      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
                    case "down":
                      return <XCircle className="h-5 w-5 text-red-600" />;
                  }
                };

                const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
                  switch (endpoint.status) {
                    case "healthy":
                      return "default";
                    case "degraded":
                      return "secondary";
                    case "down":
                      return "destructive";
                  }
                };

                return (
                  <div
                    key={endpoint.endpointId}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon()}
                      <div>
                        <p className="font-medium">{endpoint.endpointName}</p>
                        <p className="text-xs text-muted-foreground">
                          {endpoint.projectName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium">
                          {endpoint.latency > 0
                            ? `${endpoint.latency}ms avg`
                            : "No requests"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {endpoint.errorRate > 0
                            ? `${endpoint.errorRate.toFixed(1)}% errors`
                            : endpoint.lastRequest
                            ? "No errors"
                            : "Not tested"}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant()}>
                        {endpoint.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No endpoints deployed yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
