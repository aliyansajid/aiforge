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
 * Cloud Run service names are in format: aiforge-{endpointId}
 * URL format: https://aiforge-cmi1q6xdp0006fpfkxif-n2v5xbqiba-el.a.run.app
 * We need to extract: aiforge-cmi1q6xdp0006fpfkxif (first 2 segments before the hash)
 */
function extractServiceNameFromUrl(serviceUrl: string): string | null {
  try {
    const url = new URL(serviceUrl);
    const hostname = url.hostname;

    // Split by '.' to get: ["aiforge-cmi1q6xdp0006fpfkxif-n2v5xbqiba-el", "a", "run", "app"]
    const parts = hostname.split('.');
    if (parts.length < 3) return null;

    // First part: aiforge-cmi1q6xdp0006fpfkxif-n2v5xbqiba-el
    const servicePart = parts[0];

    // Our service naming: aiforge-{endpointId}
    // The URL adds a hash suffix: aiforge-{endpointId}-{hash}-{region}
    // We need to extract just: aiforge-{endpointId}

    // Split by hyphen to get segments
    const segments = servicePart.split('-');

    // The service name is always "aiforge-{endpointId}"
    // endpointId is a cuid which is ~25 chars, but we slice to 20 in deployment
    // So we need the first 2 segments: aiforge + endpointId
    if (segments.length >= 2 && segments[0] === 'aiforge') {
      return `${segments[0]}-${segments[1]}`;
    }

    // Fallback: return the entire service part (might not work for metrics)
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

      // Fetch latency data from Cloud Run
      const latencyData = await getCloudRunMetric(
        serviceName,
        CLOUD_RUN_METRICS.REQUEST_LATENCIES,
        startTime,
        endTime,
        { alignmentPeriod: 300, perSeriesAligner: "ALIGN_DELTA" }
      );

      // Calculate average latency
      const avgLatency =
        latencyData.length > 0
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
        sortedLatencies.length > 0 ? sortedLatencies[p95Index] || 0 : 0;

      // For Cloud Run, we don't have direct error rate metrics
      // We would need to check response codes or use error reporting
      // For now, we'll use latency as a health indicator
      const errorRate = 0; // Placeholder

      // Determine health status based on latency
      let status: "healthy" | "degraded" | "down";
      if (avgLatency === 0) {
        status = "healthy"; // No requests yet
      } else if (avgLatency > 5000 || p95Latency > 10000) {
        status = "degraded";
      } else if (avgLatency > 10000) {
        status = "down";
      } else {
        status = "healthy";
      }

      const lastRequest =
        latencyData.length > 0
          ? latencyData[latencyData.length - 1].timestamp
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

    // Calculate overall metrics
    const allLatencies = endpointHealth
      .filter((e) => e.latency > 0)
      .map((e) => e.latency);

    const avgLatency =
      allLatencies.length > 0
        ? Math.round(
            allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length
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
