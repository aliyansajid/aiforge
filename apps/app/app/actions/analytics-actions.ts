"use server";

import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import { ActionResponse } from "@/types";
import {
  getCloudRunMetric,
  CLOUD_RUN_METRICS,
  calculateMetricSummary,
} from "@/lib/cloud-run-metrics";

export interface UsageMetrics {
  totalRequests: number;
  avgResponseTime: number;
  estimatedCost: number;
  endpointBreakdown: {
    endpointId: string;
    endpointName: string;
    projectName: string;
    serviceName: string;
    requestCount: number;
    avgResponseTime: number;
    totalCost: number;
  }[];
}

export interface PerformanceMetrics {
  uptime: number;
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  endpointHealth: {
    endpointId: string;
    endpointName: string;
    projectName: string;
    serviceName: string;
    status: "healthy" | "degraded" | "down";
    latency: number;
    errorRate: number;
    lastRequest: Date | null;
  }[];
}

/**
 * Extract service name from Cloud Run URL
 * Cloud Run service names can be:
 * - Old format: aiforge-{endpointId}
 * - New format: model-{endpointId}
 *
 * URL format: https://model-cmi4tavmz0002aseaeyj1dl7f-n2v5xbqiba-el.a.run.app
 * We need to extract: model-cmi4tavmz0002aseaeyj1dl7f (first 2 segments before the hash)
 */
function extractServiceNameFromUrl(serviceUrl: string): string | null {
  try {
    const url = new URL(serviceUrl);
    const hostname = url.hostname;

    // Split by '.' to get: ["model-cmi4tavmz0002aseaeyj1dl7f-n2v5xbqiba-el", "a", "run", "app"]
    const parts = hostname.split(".");
    if (parts.length < 3) return null;

    // First part: model-cmi4tavmz0002aseaeyj1dl7f-n2v5xbqiba-el
    const servicePart = parts[0];
    if (!servicePart) return null;

    // Our service naming: {prefix}-{endpointId}
    // The URL adds a hash suffix: {prefix}-{endpointId}-{hash}-{region}
    // We need to extract just: {prefix}-{endpointId}

    // Split by hyphen to get segments
    const segments = servicePart.split("-");

    // The service name is always "{prefix}-{endpointId}" where prefix is "model" or "aiforge"
    // endpointId is a cuid which is ~25 chars
    // So we need the first 2 segments: prefix + endpointId
    if (
      segments.length >= 2 &&
      (segments[0] === "model" || segments[0] === "aiforge")
    ) {
      return `${segments[0]}-${segments[1]}`;
    }

    // Fallback: return the entire service part (might not work for metrics)
    console.warn(`Could not extract service name from: ${serviceUrl}`);
    return servicePart;
  } catch (error) {
    console.error("Error extracting service name:", error);
    return null;
  }
}

export async function getUsageMetrics(
  teamSlug: string,
  days: number = 30
): Promise<ActionResponse<UsageMetrics>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view analytics",
      data: null,
    };
  }

  try {
    // Verify user is a member of the team and get all endpoints
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
      },
      include: {
        team: {
          include: {
            projects: {
              include: {
                endpoints: {
                  where: {
                    status: "DEPLOYED", // Only get deployed endpoints
                    serviceUrl: {
                      not: null,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "Team not found or you don't have access",
        data: null,
      };
    }

    // Get all deployed endpoints with their service URLs
    const endpoints = teamMember.team.projects.flatMap((project) =>
      project.endpoints.map((endpoint) => ({
        id: endpoint.id,
        name: endpoint.name,
        projectName: project.name,
        serviceUrl: endpoint.serviceUrl!,
      }))
    );

    if (endpoints.length === 0) {
      return {
        success: true,
        message: "No deployed endpoints found",
        data: {
          totalRequests: 0,
          avgResponseTime: 0,
          estimatedCost: 0,
          endpointBreakdown: [],
        },
      };
    }

    // Calculate date range
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch metrics from Cloud Run for all endpoints in parallel
    const endpointMetricsPromises = endpoints.map(async (endpoint) => {
      const serviceName = extractServiceNameFromUrl(endpoint.serviceUrl);
      if (!serviceName) {
        return {
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          projectName: endpoint.projectName,
          serviceName: "unknown",
          requestCount: 0,
          avgResponseTime: 0,
          totalCost: 0,
        };
      }

      // Fetch request count and latency metrics from Cloud Run
      console.log(`[Analytics] Fetching metrics for service: ${serviceName}`);
      const [requestCountData, latencyData] = await Promise.all([
        getCloudRunMetric(
          serviceName,
          CLOUD_RUN_METRICS.REQUEST_COUNT,
          startTime,
          endTime,
          { alignmentPeriod: 3600, perSeriesAligner: "ALIGN_SUM" }
        ),
        getCloudRunMetric(
          serviceName,
          CLOUD_RUN_METRICS.REQUEST_LATENCIES,
          startTime,
          endTime,
          { alignmentPeriod: 3600, perSeriesAligner: "ALIGN_DELTA" }
        ),
      ]);

      console.log(
        `[Analytics] ${serviceName}: ${requestCountData.length} request data points, ${latencyData.length} latency data points`
      );

      // Calculate total requests
      const requestCount = requestCountData.reduce(
        (sum, point) => sum + point.value,
        0
      );

      // Calculate average latency (latencies are in milliseconds)
      const avgResponseTime =
        latencyData.length > 0
          ? Math.round(
              latencyData.reduce((sum, point) => sum + point.value, 0) /
                latencyData.length
            )
          : 0;

      // Estimate cost (simplified: $0.0001 per request + compute time)
      // This is a placeholder - you should implement proper cost calculation
      const totalCost = requestCount * 0.0001;

      return {
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        projectName: endpoint.projectName,
        serviceName,
        requestCount: Math.round(requestCount),
        avgResponseTime,
        totalCost,
      };
    });

    const endpointBreakdown = await Promise.all(endpointMetricsPromises);

    // Calculate total metrics
    const totalRequests = endpointBreakdown.reduce(
      (sum, endpoint) => sum + endpoint.requestCount,
      0
    );

    const avgResponseTime =
      endpointBreakdown.length > 0
        ? Math.round(
            endpointBreakdown.reduce(
              (sum, endpoint) =>
                sum + endpoint.avgResponseTime * endpoint.requestCount,
              0
            ) / (totalRequests || 1)
          )
        : 0;

    const estimatedCost = endpointBreakdown.reduce(
      (sum, endpoint) => sum + endpoint.totalCost,
      0
    );

    // Sort by request count descending
    endpointBreakdown.sort((a, b) => b.requestCount - a.requestCount);

    return {
      success: true,
      message: "Usage metrics fetched successfully",
      data: {
        totalRequests,
        avgResponseTime,
        estimatedCost,
        endpointBreakdown,
      },
    };
  } catch (error) {
    console.error("Error fetching usage metrics:", error);
    return {
      success: false,
      message: "Failed to fetch usage metrics",
      data: null,
    };
  }
}

export async function getPerformanceMetrics(
  teamSlug: string,
  hours: number = 24
): Promise<ActionResponse<PerformanceMetrics>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view analytics",
      data: null,
    };
  }

  try {
    // Verify user is a member of the team and get all deployed endpoints
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
      },
      include: {
        team: {
          include: {
            projects: {
              include: {
                endpoints: {
                  where: {
                    status: "DEPLOYED",
                    serviceUrl: {
                      not: null,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "Team not found or you don't have access",
        data: null,
      };
    }

    // Get all deployed endpoints with their service URLs
    const endpoints = teamMember.team.projects.flatMap((project) =>
      project.endpoints.map((endpoint) => ({
        id: endpoint.id,
        name: endpoint.name,
        projectName: project.name,
        serviceUrl: endpoint.serviceUrl!,
        lastUsedAt: endpoint.lastUsedAt,
      }))
    );

    if (endpoints.length === 0) {
      return {
        success: true,
        message: "No deployed endpoints found",
        data: {
          uptime: 100,
          avgLatency: 0,
          p95Latency: 0,
          errorRate: 0,
          endpointHealth: [],
        },
      };
    }

    // Calculate date range
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    // Fetch performance metrics from Cloud Run for all endpoints
    const endpointHealthPromises = endpoints.map(async (endpoint) => {
      const serviceName = extractServiceNameFromUrl(endpoint.serviceUrl);
      if (!serviceName) {
        return {
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          projectName: endpoint.projectName,
          serviceName: "unknown",
          status: "healthy" as const,
          latency: 0,
          errorRate: 0,
          lastRequest: endpoint.lastUsedAt,
        };
      }

      // Fetch both request count and latency data
      const [requestCountData, latencyData] = await Promise.all([
        getCloudRunMetric(
          serviceName,
          CLOUD_RUN_METRICS.REQUEST_COUNT,
          startTime,
          endTime,
          { alignmentPeriod: 300, perSeriesAligner: "ALIGN_SUM" }
        ),
        getCloudRunMetric(
          serviceName,
          CLOUD_RUN_METRICS.REQUEST_LATENCIES,
          startTime,
          endTime,
          { alignmentPeriod: 300, perSeriesAligner: "ALIGN_DELTA" }
        ),
      ]);

      // Only calculate latency if we have actual requests
      const hasRequests = requestCountData.some((point) => point.value > 0);

      // Calculate average latency
      const avgLatency =
        latencyData.length > 0 && hasRequests
          ? Math.round(
              latencyData.reduce((sum, point) => sum + point.value, 0) /
                latencyData.length
            )
          : 0;

      // Calculate P95 latency
      const sortedLatencies = latencyData
        .map((p) => p.value)
        .sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95Latency =
        sortedLatencies.length > 0 && hasRequests
          ? sortedLatencies[p95Index] || 0
          : 0;

      // For Cloud Run, we don't have direct error rate metrics
      // We would need to check response codes or use error reporting
      // For now, we'll use latency as a health indicator
      const errorRate = 0; // Placeholder

      // Determine health status based on latency
      let status: "healthy" | "degraded" | "down";
      if (avgLatency === 0 || !hasRequests) {
        status = "healthy"; // No requests yet or service is ready
      } else if (avgLatency > 5000 || p95Latency > 10000) {
        status = "degraded";
      } else if (avgLatency > 10000) {
        status = "down";
      } else {
        status = "healthy";
      }

      const lastRequest =
        requestCountData.length > 0 && hasRequests
          ? requestCountData[requestCountData.length - 1]?.timestamp || endpoint.lastUsedAt
          : endpoint.lastUsedAt;

      return {
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        projectName: endpoint.projectName,
        serviceName,
        status,
        latency: avgLatency,
        errorRate,
        lastRequest,
      };
    });

    const endpointHealth = await Promise.all(endpointHealthPromises);

    // Calculate overall metrics - only from endpoints with actual requests
    const endpointsWithRequests = endpointHealth.filter((e) => e.latency > 0);
    const allLatencies = endpointsWithRequests.map((e) => e.latency);

    const avgLatency =
      allLatencies.length > 0
        ? Math.round(
            allLatencies.reduce((sum, lat) => sum + lat, 0) /
              allLatencies.length
          )
        : 0;

    // Calculate overall P95 latency
    const sortedAllLatencies = allLatencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedAllLatencies.length * 0.95);
    const p95Latency =
      sortedAllLatencies.length > 0 ? sortedAllLatencies[p95Index] || 0 : 0;

    // Calculate uptime (percentage of healthy endpoints)
    const healthyCount = endpointHealth.filter(
      (e) => e.status === "healthy"
    ).length;
    const uptime =
      endpointHealth.length > 0
        ? (healthyCount / endpointHealth.length) * 100
        : 100;

    // Calculate overall error rate (average)
    const errorRate =
      endpointHealth.length > 0
        ? endpointHealth.reduce((sum, e) => sum + e.errorRate, 0) /
          endpointHealth.length
        : 0;

    return {
      success: true,
      message: "Performance metrics fetched successfully",
      data: {
        uptime,
        avgLatency,
        p95Latency,
        errorRate,
        endpointHealth,
      },
    };
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return {
      success: false,
      message: "Failed to fetch performance metrics",
      data: null,
    };
  }
}

// New action to get time-series data for charts
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
}

export interface RequestVolumeData {
  timeSeries: TimeSeriesDataPoint[];
  totalRequests: number;
}

export interface ResponseTimeData {
  timeSeries: TimeSeriesDataPoint[];
  avgLatency: number;
  p95Latency: number;
}

export async function getRequestVolumeData(
  teamSlug: string,
  hours: number = 24
): Promise<ActionResponse<RequestVolumeData>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view analytics",
      data: null,
    };
  }

  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: { slug: teamSlug },
      },
      include: {
        team: {
          include: {
            projects: {
              include: {
                endpoints: {
                  where: {
                    status: "DEPLOYED",
                    serviceUrl: { not: null },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "Team not found or you don't have access",
        data: null,
      };
    }

    const endpoints = teamMember.team.projects.flatMap((project) =>
      project.endpoints.map((endpoint) => ({
        serviceUrl: endpoint.serviceUrl!,
      }))
    );

    console.log(`[Analytics] Found ${endpoints.length} deployed endpoints for team ${teamSlug}`);

    if (endpoints.length === 0) {
      console.log(`[Analytics] No endpoints found for team ${teamSlug}`);
      return {
        success: true,
        message: "No deployed endpoints found",
        data: { timeSeries: [], totalRequests: 0 },
      };
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    // Aggregate request counts from all endpoints
    const allDataPromises = endpoints.map(async (endpoint) => {
      const serviceName = extractServiceNameFromUrl(endpoint.serviceUrl);
      console.log(`[Analytics] Service URL: ${endpoint.serviceUrl}, Extracted service name: ${serviceName}`);
      if (!serviceName) {
        console.warn(`[Analytics] Could not extract service name from: ${endpoint.serviceUrl}`);
        return [];
      }

      console.log(`[Analytics] Fetching request count for ${serviceName} from ${startTime.toISOString()} to ${endTime.toISOString()}`);
      const data = await getCloudRunMetric(
        serviceName,
        CLOUD_RUN_METRICS.REQUEST_COUNT,
        startTime,
        endTime,
        { alignmentPeriod: 300, perSeriesAligner: "ALIGN_SUM" }
      );
      console.log(`[Analytics] Received ${data.length} data points for ${serviceName}`);
      return data;
    });

    const allData = await Promise.all(allDataPromises);

    // Merge and aggregate data points by timestamp
    const dataByTimestamp = new Map<number, number>();

    allData.flat().forEach((point) => {
      const ts = point.timestamp.getTime();
      dataByTimestamp.set(ts, (dataByTimestamp.get(ts) || 0) + point.value);
    });

    // Convert to sorted array
    const timeSeries = Array.from(dataByTimestamp.entries())
      .map(([ts, value]) => ({
        timestamp: new Date(ts),
        value: Math.round(value),
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const totalRequests = timeSeries.reduce(
      (sum, point) => sum + point.value,
      0
    );

    console.log(`[Analytics] Returning ${timeSeries.length} time series data points, total requests: ${totalRequests}`);

    return {
      success: true,
      message: "Request volume data fetched successfully",
      data: { timeSeries, totalRequests },
    };
  } catch (error) {
    console.error("Error fetching request volume data:", error);
    return {
      success: false,
      message: "Failed to fetch request volume data",
      data: null,
    };
  }
}

export async function getResponseTimeData(
  teamSlug: string,
  hours: number = 24
): Promise<ActionResponse<ResponseTimeData>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view analytics",
      data: null,
    };
  }

  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: { slug: teamSlug },
      },
      include: {
        team: {
          include: {
            projects: {
              include: {
                endpoints: {
                  where: {
                    status: "DEPLOYED",
                    serviceUrl: { not: null },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "Team not found or you don't have access",
        data: null,
      };
    }

    const endpoints = teamMember.team.projects.flatMap((project) =>
      project.endpoints.map((endpoint) => ({
        serviceUrl: endpoint.serviceUrl!,
      }))
    );

    console.log(`[Analytics] Found ${endpoints.length} deployed endpoints for response time data`);

    if (endpoints.length === 0) {
      return {
        success: true,
        message: "No deployed endpoints found",
        data: { timeSeries: [], avgLatency: 0, p95Latency: 0 },
      };
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    // Aggregate latency data from all endpoints
    const allDataPromises = endpoints.map(async (endpoint) => {
      const serviceName = extractServiceNameFromUrl(endpoint.serviceUrl);
      console.log(`[Analytics] Fetching latency for service: ${serviceName}`);
      if (!serviceName) return [];

      const data = await getCloudRunMetric(
        serviceName,
        CLOUD_RUN_METRICS.REQUEST_LATENCIES,
        startTime,
        endTime,
        { alignmentPeriod: 300, perSeriesAligner: "ALIGN_DELTA" }
      );
      console.log(`[Analytics] Received ${data.length} latency data points for ${serviceName}`);
      return data;
    });

    const allData = await Promise.all(allDataPromises);

    // Merge and average data points by timestamp
    const dataByTimestamp = new Map<
      number,
      { sum: number; count: number }
    >();

    allData.flat().forEach((point) => {
      const ts = point.timestamp.getTime();
      const existing = dataByTimestamp.get(ts) || { sum: 0, count: 0 };
      dataByTimestamp.set(ts, {
        sum: existing.sum + point.value,
        count: existing.count + 1,
      });
    });

    // Convert to sorted array with averages
    const timeSeries = Array.from(dataByTimestamp.entries())
      .map(([ts, { sum, count }]) => ({
        timestamp: new Date(ts),
        value: Math.round(sum / count),
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const values = timeSeries.map((p) => p.value);
    const avgLatency =
      values.length > 0
        ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
        : 0;

    const sortedValues = [...values].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedValues.length * 0.95);
    const p95Latency = sortedValues.length > 0 ? sortedValues[p95Index] || 0 : 0;

    console.log(`[Analytics] Returning ${timeSeries.length} latency data points, avg: ${avgLatency}ms, p95: ${p95Latency}ms`);

    return {
      success: true,
      message: "Response time data fetched successfully",
      data: { timeSeries, avgLatency, p95Latency },
    };
  } catch (error) {
    console.error("Error fetching response time data:", error);
    return {
      success: false,
      message: "Failed to fetch response time data",
      data: null,
    };
  }
}

// Infrastructure metrics from Cloud Run
export interface InfrastructureMetrics {
  cpuUtilization: number; // Average percentage
  memoryUtilization: number; // Average percentage
  activeInstances: number; // Current number of instances
  totalInstances: number; // Total across all endpoints
}

export async function getInfrastructureMetrics(
  teamSlug: string,
  hours: number = 1
): Promise<ActionResponse<InfrastructureMetrics>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view analytics",
      data: null,
    };
  }

  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: { slug: teamSlug },
      },
      include: {
        team: {
          include: {
            projects: {
              include: {
                endpoints: {
                  where: {
                    status: "DEPLOYED",
                    serviceUrl: { not: null },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "Team not found or you don't have access",
        data: null,
      };
    }

    const endpoints = teamMember.team.projects.flatMap((project) =>
      project.endpoints.map((endpoint) => ({
        serviceUrl: endpoint.serviceUrl!,
      }))
    );

    if (endpoints.length === 0) {
      return {
        success: true,
        message: "No deployed endpoints found",
        data: {
          cpuUtilization: 0,
          memoryUtilization: 0,
          activeInstances: 0,
          totalInstances: 0,
        },
      };
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    // Fetch infrastructure metrics from all endpoints
    const metricsPromises = endpoints.map(async (endpoint) => {
      const serviceName = extractServiceNameFromUrl(endpoint.serviceUrl);
      if (!serviceName) {
        return { cpu: [], memory: [], instances: [] };
      }

      const [cpu, memory, instances] = await Promise.all([
        getCloudRunMetric(
          serviceName,
          CLOUD_RUN_METRICS.CONTAINER_CPU_UTILIZATION,
          startTime,
          endTime,
          { alignmentPeriod: 60, perSeriesAligner: "ALIGN_DELTA" }
        ),
        getCloudRunMetric(
          serviceName,
          CLOUD_RUN_METRICS.CONTAINER_MEMORY_UTILIZATION,
          startTime,
          endTime,
          { alignmentPeriod: 60, perSeriesAligner: "ALIGN_DELTA" }
        ),
        getCloudRunMetric(
          serviceName,
          CLOUD_RUN_METRICS.CONTAINER_INSTANCE_COUNT,
          startTime,
          endTime,
          { alignmentPeriod: 60, perSeriesAligner: "ALIGN_MEAN" }
        ),
      ]);

      return { cpu, memory, instances };
    });

    const allMetrics = await Promise.all(metricsPromises);

    // Calculate averages
    const allCpuValues = allMetrics.flatMap((m) => m.cpu.map((p) => p.value));
    const allMemoryValues = allMetrics.flatMap((m) =>
      m.memory.map((p) => p.value)
    );
    const allInstanceValues = allMetrics.flatMap((m) =>
      m.instances.map((p) => p.value)
    );

    const cpuUtilization =
      allCpuValues.length > 0
        ? Math.round(
            (allCpuValues.reduce((sum, v) => sum + v, 0) /
              allCpuValues.length) *
              100
          )
        : 0;

    const memoryUtilization =
      allMemoryValues.length > 0
        ? Math.round(
            (allMemoryValues.reduce((sum, v) => sum + v, 0) /
              allMemoryValues.length) *
              100
          )
        : 0;

    // Get current instance count (most recent value)
    const activeInstances =
      allInstanceValues.length > 0
        ? Math.round(allInstanceValues[allInstanceValues.length - 1] || 0)
        : 0;

    const totalInstances = endpoints.length;

    return {
      success: true,
      message: "Infrastructure metrics fetched successfully",
      data: {
        cpuUtilization,
        memoryUtilization,
        activeInstances,
        totalInstances,
      },
    };
  } catch (error) {
    console.error("Error fetching infrastructure metrics:", error);
    return {
      success: false,
      message: "Failed to fetch infrastructure metrics",
      data: null,
    };
  }
}
