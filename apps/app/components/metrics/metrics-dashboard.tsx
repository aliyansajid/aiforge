"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  Clock,
  Cpu,
  HardDrive,
  Network,
  Server,
  TrendingUp,
  Zap,
  DollarSign,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { MetricCard } from "./metric-card";
import { MetricLineChart } from "./metric-line-chart";
import { MetricAreaChart } from "./metric-area-chart";
import { getEndpointMetrics } from "@/app/actions/metrics-actions";
import { toast } from "sonner";

// Client-side utility functions (moved from cloud-run-metrics.ts to avoid Node.js imports)
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

export function MetricsDashboard() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("24");

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);

    const result = await getEndpointMetrics(
      params.teamSlug as string,
      params.projectSlug as string,
      params.endpointSlug as string,
      parseInt(timeRange)
    );

    if (result.success && result.data) {
      setMetrics(result.data);
    } else {
      setError(result.message);
      toast.error(result.message);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
    toast.success("Metrics refreshed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          {error || "Failed to load metrics"}
        </AlertDescription>
      </Alert>
    );
  }

  const m = metrics.metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Performance Metrics</h3>
          <p className="text-sm text-muted-foreground">
            Real-time metrics from Google Cloud Run
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last hour</SelectItem>
              <SelectItem value="6">Last 6 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="72">Last 3 days</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            {refreshing ? <Spinner /> : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Request Count"
          description="Total requests per second"
          value={m.requestCount.summary.current}
          summary={m.requestCount.summary}
          icon={Activity}
          unit=" req/s"
        />
        <MetricCard
          title="Avg Latency"
          description="Average response time"
          value={formatDuration(m.requestLatencies.summary.average)}
          summary={m.requestLatencies.summary}
          icon={Clock}
          formatter={(v) => formatDuration(v)}
        />
        <MetricCard
          title="CPU Usage"
          description="Container CPU utilization"
          value={m.cpuUtilization.summary.current}
          summary={m.cpuUtilization.summary}
          icon={Cpu}
          unit="%"
        />
        <MetricCard
          title="Memory Usage"
          description="Container memory utilization"
          value={m.memoryUtilization.summary.current}
          summary={m.memoryUtilization.summary}
          icon={HardDrive}
          unit="%"
        />
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricLineChart
              title="Request Count"
              description="Requests per second over time"
              data={m.requestCount.data}
              dataKey="value"
              color="#3b82f6"
              yAxisFormatter={(v) => v.toFixed(1)}
              tooltipFormatter={(v) => `${v.toFixed(2)} req/s`}
            />
            <MetricLineChart
              title="Request Latency"
              description="Average response time"
              data={m.requestLatencies.data}
              dataKey="value"
              color="#8b5cf6"
              yAxisFormatter={(v) => formatDuration(v)}
              tooltipFormatter={(v) => formatDuration(v)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricCard
              title="Max Concurrent Requests"
              description="Peak concurrent request load"
              value={m.maxConcurrentRequests.summary.max}
              summary={m.maxConcurrentRequests.summary}
              icon={Users}
              formatter={(v) => v.toFixed(0)}
            />
            <MetricCard
              title="Startup Latency"
              description="Container cold start time"
              value={formatDuration(m.startupLatency.summary.average)}
              summary={m.startupLatency.summary}
              icon={Zap}
              formatter={(v) => formatDuration(v)}
            />
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricAreaChart
              title="CPU Utilization"
              description="Percentage of allocated CPU used"
              data={m.cpuUtilization.data}
              dataKey="value"
              color="#ef4444"
              yAxisFormatter={(v) => `${v.toFixed(1)}%`}
              tooltipFormatter={(v) => `${v.toFixed(2)}%`}
            />
            <MetricAreaChart
              title="Memory Utilization"
              description="Percentage of allocated memory used"
              data={m.memoryUtilization.data}
              dataKey="value"
              color="#f59e0b"
              yAxisFormatter={(v) => `${v.toFixed(1)}%`}
              tooltipFormatter={(v) => `${v.toFixed(2)}%`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricLineChart
              title="Container Instances"
              description="Number of running containers"
              data={m.instanceCount.data}
              dataKey="value"
              color="#10b981"
              yAxisFormatter={(v) => v.toFixed(0)}
              tooltipFormatter={(v) => `${v.toFixed(0)} instances`}
            />
            <MetricCard
              title="Billable Instance Time"
              description="Total compute time billed"
              value={formatDuration(m.billableTime.summary.current * 1000)}
              summary={m.billableTime.summary}
              icon={DollarSign}
              formatter={(v) => formatDuration(v * 1000)}
            />
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricLineChart
              title="Network Sent"
              description="Bytes sent per second"
              data={m.sentBytes.data}
              dataKey="value"
              color="#06b6d4"
              yAxisFormatter={(v) => formatBytes(v)}
              tooltipFormatter={(v) => `${formatBytes(v)}/s`}
            />
            <MetricLineChart
              title="Network Received"
              description="Bytes received per second"
              data={m.receivedBytes.data}
              dataKey="value"
              color="#8b5cf6"
              yAxisFormatter={(v) => formatBytes(v)}
              tooltipFormatter={(v) => `${formatBytes(v)}/s`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricCard
              title="Total Sent"
              description="Total bytes sent"
              value={formatBytes(
                m.sentBytes.data.reduce((sum: number, p: any) => sum + p.value, 0)
              )}
              icon={Network}
            />
            <MetricCard
              title="Total Received"
              description="Total bytes received"
              value={formatBytes(
                m.receivedBytes.data.reduce((sum: number, p: any) => sum + p.value, 0)
              )}
              icon={Network}
            />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricLineChart
              title="Max Concurrent Requests"
              description="Peak concurrent requests over time"
              data={m.maxConcurrentRequests.data}
              dataKey="value"
              color="#ec4899"
              yAxisFormatter={(v) => v.toFixed(0)}
              tooltipFormatter={(v) => `${v.toFixed(0)} requests`}
            />
            <MetricLineChart
              title="Container Startup Latency"
              description="Time to start new container instances"
              data={m.startupLatency.data}
              dataKey="value"
              color="#f59e0b"
              yAxisFormatter={(v) => formatDuration(v)}
              tooltipFormatter={(v) => formatDuration(v)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Avg Requests/Instance"
                description="Request distribution"
                value={
                  m.instanceCount.summary.average > 0
                    ? (m.requestCount.summary.average / m.instanceCount.summary.average).toFixed(2)
                    : "0"
                }
                icon={Server}
                unit=" req/inst"
              />
              <MetricCard
                title="Peak Concurrency"
                description="Maximum concurrent load"
                value={m.maxConcurrentRequests.summary.max}
                icon={TrendingUp}
                formatter={(v) => v.toFixed(0)}
              />
              <MetricCard
                title="Avg CPU per Request"
                description="CPU efficiency"
                value={
                  m.requestCount.summary.average > 0
                    ? (m.cpuUtilization.summary.average / m.requestCount.summary.average).toFixed(2)
                    : "0"
                }
                icon={Cpu}
                unit="%"
              />
              <MetricCard
                title="Avg Memory per Request"
                description="Memory efficiency"
                value={
                  m.requestCount.summary.average > 0
                    ? (m.memoryUtilization.summary.average / m.requestCount.summary.average).toFixed(2)
                    : "0"
                }
                icon={HardDrive}
                unit="%"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
