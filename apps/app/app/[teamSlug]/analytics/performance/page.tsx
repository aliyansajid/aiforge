import { getUserTeams } from "@/app/actions/team-actions";
import { getTeamProjects } from "@/app/actions/project-actions";
import {
  getPerformanceMetrics,
  getResponseTimeData,
} from "@/app/actions/analytics-actions";
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
import { ResponseTimeChart } from "@/components/analytics/response-time-chart";

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

  // Get response time time-series data
  const responseTimeResult = await getResponseTimeData(
    resolvedParams.teamSlug,
    24
  );
  const responseTimeData = responseTimeResult.data ?? {
    timeSeries: [],
    avgLatency: 0,
    p95Latency: 0,
  };

  console.log('[Performance Page] Response time data:', {
    success: responseTimeResult.success,
    dataPoints: responseTimeData.timeSeries.length,
    avgLatency: responseTimeData.avgLatency,
    firstPoint: responseTimeData.timeSeries[0],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Performance Analytics</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Monitor endpoint performance and reliability
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.uptime.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
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
          <CardHeader className="flex flex-row items-center justify-between">
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
          <CardHeader className="flex flex-row items-center justify-between">
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

      <ResponseTimeChart data={responseTimeData.timeSeries} />

      <Card>
        <CardHeader>
          <CardTitle>Endpoint Health</CardTitle>
          <CardDescription>Status of all deployed endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceMetrics.endpointHealth.length > 0 ? (
            <div className="space-y-3">
              {performanceMetrics.endpointHealth.map((endpoint) => {
                const getStatusIcon = () => {
                  switch (endpoint.status) {
                    case "healthy":
                      return (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      );
                    case "degraded":
                      return (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      );
                    case "down":
                      return <XCircle className="h-5 w-5 text-red-500" />;
                  }
                };

                const getStatusVariant = ():
                  | "default"
                  | "secondary"
                  | "destructive"
                  | "outline" => {
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
