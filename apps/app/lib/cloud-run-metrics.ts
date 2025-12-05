import { MetricServiceClient } from '@google-cloud/monitoring';
import { getGoogleCredentials } from './gcp-credentials';

// Initialize the Monitoring client
let client: MetricServiceClient | null = null;

function getClient(): MetricServiceClient {
  if (!client) {
    const credentials = getGoogleCredentials();
    client = new MetricServiceClient(credentials);
  }
  return client;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

export interface MetricSummary {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
}

// Cloud Run metric types from Google Cloud Monitoring
export const CLOUD_RUN_METRICS = {
  // Request metrics
  REQUEST_COUNT: 'run.googleapis.com/request_count',
  REQUEST_LATENCIES: 'run.googleapis.com/request_latencies',

  // Container metrics
  CONTAINER_CPU_UTILIZATION: 'run.googleapis.com/container/cpu/utilizations',
  CONTAINER_MEMORY_UTILIZATION: 'run.googleapis.com/container/memory/utilizations',
  CONTAINER_INSTANCE_COUNT: 'run.googleapis.com/container/instance_count',
  BILLABLE_INSTANCE_TIME: 'run.googleapis.com/container/billable_instance_time',

  // Network metrics
  SENT_BYTES: 'run.googleapis.com/container/network/sent_bytes_count',
  RECEIVED_BYTES: 'run.googleapis.com/container/network/received_bytes_count',

  // Performance metrics
  MAX_CONCURRENT_REQUESTS: 'run.googleapis.com/container/max_request_concurrencies',
  STARTUP_LATENCY: 'run.googleapis.com/container/startup_latency',
} as const;

/**
 * Fetch time series data for a specific Cloud Run metric
 */
export async function getCloudRunMetric(
  serviceName: string,
  metricType: string,
  startTime: Date,
  endTime: Date,
  aggregation?: {
    alignmentPeriod?: number; // seconds
    perSeriesAligner?: string;
    crossSeriesReducer?: string;
  }
): Promise<MetricDataPoint[]> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    console.error('GOOGLE_CLOUD_PROJECT environment variable not set');
    return [];
  }

  try {
    const monitoringClient = getClient();

    const request = {
      name: `projects/${projectId}`,
      filter: `
        resource.type = "cloud_run_revision" AND
        resource.labels.service_name = "${serviceName}" AND
        metric.type = "${metricType}"
      `.trim(),
      interval: {
        startTime: {
          seconds: Math.floor(startTime.getTime() / 1000),
        },
        endTime: {
          seconds: Math.floor(endTime.getTime() / 1000),
        },
      },
      ...(aggregation && {
        aggregation: {
          alignmentPeriod: {
            seconds: aggregation.alignmentPeriod || 60,
          },
          perSeriesAligner: (aggregation.perSeriesAligner || 'ALIGN_MEAN') as 'ALIGN_MEAN',
          crossSeriesReducer: (aggregation.crossSeriesReducer || 'REDUCE_SUM') as 'REDUCE_SUM',
        },
      }),
    };

    console.log(`[CloudRun] Fetching metric: ${metricType} for service: ${serviceName}`);
    console.log(`[CloudRun] Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);

    const response = await monitoringClient.listTimeSeries(request);
    const timeSeries = response[0] || [];

    console.log(`[CloudRun] Received ${timeSeries.length} time series for ${metricType}`);

    if (timeSeries.length === 0) {
      console.log(`[CloudRun] No data found for ${metricType}`);
    }

    const dataPoints: MetricDataPoint[] = [];

    for (const series of timeSeries) {
      if (!series.points) continue;

      for (const point of series.points) {
        if (!point.interval?.endTime?.seconds) continue;

        const value =
          point.value?.doubleValue ??
          point.value?.int64Value ??
          point.value?.distributionValue?.mean ??
          0;

        dataPoints.push({
          timestamp: new Date(Number(point.interval.endTime.seconds) * 1000),
          value: Number(value),
        });
      }
    }

    // Sort by timestamp
    const sortedData = dataPoints.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    console.log(`[CloudRun] Returning ${sortedData.length} data points for ${metricType}`);
    if (sortedData.length > 0 && sortedData[0]) {
      console.log(`[CloudRun] Sample data point:`, {
        timestamp: sortedData[0].timestamp,
        value: sortedData[0].value,
      });
    }

    return sortedData;
  } catch (error: any) {
    // Suppress NOT_FOUND errors for startup_latency metric (expected for services without cold starts)
    const isStartupLatencyNotFound =
      metricType === CLOUD_RUN_METRICS.STARTUP_LATENCY &&
      error.code === 5; // 5 = NOT_FOUND

    if (!isStartupLatencyNotFound) {
      console.error(`Error fetching Cloud Run metric ${metricType}:`, error);
    }
    return [];
  }
}

/**
 * Calculate summary statistics from metric data points
 */
export function calculateMetricSummary(
  dataPoints: MetricDataPoint[]
): MetricSummary {
  if (dataPoints.length === 0) {
    return {
      current: 0,
      average: 0,
      min: 0,
      max: 0,
      trend: 'stable',
    };
  }

  const values = dataPoints.map((p) => p.value);
  const current = values[values.length - 1] || 0;
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate trend (compare last 25% vs first 25%)
  const quarterLength = Math.floor(values.length / 4);
  const firstQuarter = values.slice(0, quarterLength);
  const lastQuarter = values.slice(-quarterLength);

  const firstAvg =
    firstQuarter.reduce((sum, v) => sum + v, 0) / firstQuarter.length;
  const lastAvg =
    lastQuarter.reduce((sum, v) => sum + v, 0) / lastQuarter.length;

  const trendThreshold = 0.1; // 10% change
  const change = (lastAvg - firstAvg) / (firstAvg || 1);

  let trend: 'up' | 'down' | 'stable';
  if (change > trendThreshold) {
    trend = 'up';
  } else if (change < -trendThreshold) {
    trend = 'down';
  } else {
    trend = 'stable';
  }

  return {
    current,
    average,
    min,
    max,
    trend,
  };
}

/**
 * Fetch all metrics for a Cloud Run service
 */
export async function getAllCloudRunMetrics(
  serviceName: string,
  hoursBack: number = 24
) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hoursBack * 60 * 60 * 1000);

  // Fetch all metrics in parallel
  // Note: Some metrics use DISTRIBUTION type and require ALIGN_DELTA or no aligner
  const [
    requestCount,
    requestLatencies,
    cpuUtilization,
    memoryUtilization,
    instanceCount,
    billableTime,
    sentBytes,
    receivedBytes,
    maxConcurrentRequests,
    startupLatency,
  ] = await Promise.all([
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.REQUEST_COUNT,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_RATE' }
    ),
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.REQUEST_LATENCIES,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_DELTA' }
    ),
    // CPU/Memory utilizations are DISTRIBUTION metrics - use ALIGN_DELTA
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.CONTAINER_CPU_UTILIZATION,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_DELTA' }
    ),
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.CONTAINER_MEMORY_UTILIZATION,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_DELTA' }
    ),
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.CONTAINER_INSTANCE_COUNT,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_MEAN' }
    ),
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.BILLABLE_INSTANCE_TIME,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_RATE' }
    ),
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.SENT_BYTES,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_RATE' }
    ),
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.RECEIVED_BYTES,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_RATE' }
    ),
    // Max concurrent requests is DISTRIBUTION - use ALIGN_DELTA
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.MAX_CONCURRENT_REQUESTS,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_DELTA' }
    ),
    // Startup latency metric might not exist for all services
    getCloudRunMetric(
      serviceName,
      CLOUD_RUN_METRICS.STARTUP_LATENCY,
      startTime,
      endTime,
      { alignmentPeriod: 60, perSeriesAligner: 'ALIGN_DELTA' }
    ).catch(() => []), // Return empty array if metric doesn't exist
  ]);

  return {
    requestCount: {
      data: requestCount,
      summary: calculateMetricSummary(requestCount),
    },
    requestLatencies: {
      data: requestLatencies,
      summary: calculateMetricSummary(requestLatencies),
    },
    cpuUtilization: {
      data: cpuUtilization,
      summary: calculateMetricSummary(cpuUtilization),
    },
    memoryUtilization: {
      data: memoryUtilization,
      summary: calculateMetricSummary(memoryUtilization),
    },
    instanceCount: {
      data: instanceCount,
      summary: calculateMetricSummary(instanceCount),
    },
    billableTime: {
      data: billableTime,
      summary: calculateMetricSummary(billableTime),
    },
    sentBytes: {
      data: sentBytes,
      summary: calculateMetricSummary(sentBytes),
    },
    receivedBytes: {
      data: receivedBytes,
      summary: calculateMetricSummary(receivedBytes),
    },
    maxConcurrentRequests: {
      data: maxConcurrentRequests,
      summary: calculateMetricSummary(maxConcurrentRequests),
    },
    startupLatency: {
      data: startupLatency,
      summary: calculateMetricSummary(startupLatency),
    },
  };
}

/**
 * Extract service name from Cloud Run service URL
 * Cloud Run service names can be:
 * - Old format: aiforge-{endpointId}
 * - New format: model-{endpointId}
 *
 * URL format: https://model-cmi4tavmz0002aseaeyj1dl7f-n2v5xbqiba-el.a.run.app
 * We need to extract: model-cmi4tavmz0002aseaeyj1dl7f (first 2 segments before the hash)
 */
export function extractServiceName(serviceUrl: string): string | null {
  try {
    const url = new URL(serviceUrl);
    const hostname = url.hostname;

    // Split by '.' to get: ["model-cmi4tavmz0002aseaeyj1dl7f-n2v5xbqiba-el", "a", "run", "app"]
    const parts = hostname.split('.');
    if (parts.length < 3) return null;

    // First part: model-cmi4tavmz0002aseaeyj1dl7f-n2v5xbqiba-el
    const servicePart = parts[0];
    if (!servicePart) return null;

    // Our service naming: {prefix}-{endpointId}
    // The URL adds a hash suffix: {prefix}-{endpointId}-{hash}-{region}
    // We need to extract just: {prefix}-{endpointId}

    // Split by hyphen to get segments
    const segments = servicePart.split('-');

    // The service name is always "{prefix}-{endpointId}" where prefix is "model" or "aiforge"
    // endpointId is a cuid which is ~25 chars
    // So we need the first 2 segments: prefix + endpointId
    if (
      segments.length >= 2 &&
      (segments[0] === 'model' || segments[0] === 'aiforge')
    ) {
      return `${segments[0]}-${segments[1]}`;
    }

    // Fallback: return the entire service part (might not work for metrics)
    console.warn(`Could not extract service name from: ${serviceUrl}`);
    return servicePart;
  } catch (error) {
    console.error('Error extracting service name from URL:', error);
    return null;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}
