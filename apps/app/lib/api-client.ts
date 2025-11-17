const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createEndpoint(data: {
  name: string;
  description?: string;
  projectId: string;
  userId: string;
  accessType: string;
  inputType: string;
  deploymentType?: string;
  // Single file deployment
  modelFile?: File;
  requirementsFile?: File;
  inferenceFile?: File;
  // ZIP deployment
  archiveFile?: File;
  // Git deployment
  gitRepoUrl?: string;
  gitBranch?: string;
  gitCommit?: string;
  gitAccessToken?: string;
  // Pricing
  pricePerRequest?: string;
  pricePerMonth?: string;
}) {
  const formData = new FormData();

  // Basic info
  formData.append("name", data.name);
  formData.append("description", data.description || "");
  formData.append("projectId", data.projectId);
  formData.append("userId", data.userId);
  formData.append("accessType", data.accessType);
  formData.append("inputType", data.inputType);
  formData.append("deploymentType", data.deploymentType || "SINGLE_FILE");

  // Single file deployment
  if (data.modelFile) {
    formData.append("modelFile", data.modelFile);
  }
  if (data.requirementsFile) {
    formData.append("requirementsFile", data.requirementsFile);
  }
  if (data.inferenceFile) {
    formData.append("inferenceFile", data.inferenceFile);
  }

  // ZIP deployment
  if (data.archiveFile) {
    formData.append("archiveFile", data.archiveFile);
  }

  // Git deployment
  if (data.gitRepoUrl) {
    formData.append("gitRepoUrl", data.gitRepoUrl);
  }
  if (data.gitBranch) {
    formData.append("gitBranch", data.gitBranch);
  }
  if (data.gitCommit) {
    formData.append("gitCommit", data.gitCommit);
  }
  if (data.gitAccessToken) {
    formData.append("gitAccessToken", data.gitAccessToken);
  }

  // Pricing (optional, only for PAID endpoints)
  if (data.pricePerRequest) {
    formData.append("pricePerRequest", data.pricePerRequest);
  }
  if (data.pricePerMonth) {
    formData.append("pricePerMonth", data.pricePerMonth);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/endpoints/create`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create endpoint");
  }

  return response.json();
}

/**
 * Get deployment status for an endpoint
 */
export async function getDeploymentStatus(endpointId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/endpoints/${endpointId}/status`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch deployment status");
  }

  return response.json();
}

/**
 * Get endpoint details
 */
export async function getEndpoint(endpointId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/endpoints/${endpointId}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch endpoint");
  }

  return response.json();
}

/**
 * List all endpoints for a project
 */
export async function listEndpoints(projectId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/endpoints`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch endpoints");
  }

  return response.json();
}

/**
 * Delete an endpoint
 */
export async function deleteEndpoint(endpointId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/endpoints/${endpointId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete endpoint");
  }

  return response.json();
}
