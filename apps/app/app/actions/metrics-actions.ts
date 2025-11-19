'use server';

import { auth } from '@repo/auth';
import { prisma } from '@repo/db';
import {
  getAllCloudRunMetrics,
  extractServiceName,
} from '@/lib/cloud-run-metrics';

export async function getEndpointMetrics(
  teamSlug: string,
  projectSlug: string,
  endpointSlug: string,
  hoursBack: number = 24
) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: 'Please sign in to view metrics',
      data: null,
    };
  }

  try {
    // Fetch endpoint with access control
    const endpoint = await prisma.endpoint.findFirst({
      where: {
        slug: endpointSlug,
        project: {
          slug: projectSlug,
          team: {
            slug: teamSlug,
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        serviceUrl: true,
        status: true,
      },
    });

    if (!endpoint) {
      return {
        success: false,
        message: 'Endpoint not found or you don\'t have access',
        data: null,
      };
    }

    if (!endpoint.serviceUrl) {
      return {
        success: false,
        message: 'Endpoint not deployed yet. Metrics will be available after deployment.',
        data: null,
      };
    }

    if (endpoint.status !== 'DEPLOYED') {
      return {
        success: false,
        message: 'Endpoint must be deployed to view metrics',
        data: null,
      };
    }

    // Extract service name from Cloud Run URL
    const serviceName = extractServiceName(endpoint.serviceUrl);

    if (!serviceName) {
      return {
        success: false,
        message: 'Could not extract service name from URL',
        data: null,
      };
    }

    // Fetch metrics from Google Cloud Monitoring
    const metrics = await getAllCloudRunMetrics(serviceName, hoursBack);

    return {
      success: true,
      message: 'Metrics fetched successfully',
      data: {
        endpointName: endpoint.name,
        serviceName,
        metrics,
        timeRange: {
          start: new Date(Date.now() - hoursBack * 60 * 60 * 1000),
          end: new Date(),
          hoursBack,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching endpoint metrics:', error);
    return {
      success: false,
      message: 'Failed to fetch metrics. Please try again later.',
      data: null,
    };
  }
}
