"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Spinner } from "@repo/ui/components/spinner";
import { CheckCircle2, Circle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

export type DeploymentStep =
  | "INITIALIZING"
  | "UPLOADING"
  | "BUILDING"
  | "DEPLOYING"
  | "COMPLETED"
  | "FAILED";

export interface DeploymentStepStatus {
  step: DeploymentStep;
  status: "pending" | "in-progress" | "completed" | "failed";
  message: string;
  timestamp?: string;
  details?: string;
}

interface DeploymentStatusProps {
  endpointId?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const DEPLOYMENT_STEPS: {
  key: DeploymentStep;
  title: string;
  description: string;
}[] = [
  {
    key: "INITIALIZING",
    title: "Initializing Deployment",
    description: "Setting up deployment environment",
  },
  {
    key: "UPLOADING",
    title: "Uploading Files",
    description:
      "Uploading model, requirements.txt, and inference.py to Cloud Storage",
  },
  {
    key: "BUILDING",
    title: "Building Docker Image",
    description:
      "Creating containerized environment and installing dependencies",
  },
  {
    key: "DEPLOYING",
    title: "Deploying to Cloud Run",
    description: "Deploying your model to Google Cloud Run",
  },
  {
    key: "COMPLETED",
    title: "Deployment Complete",
    description: "Your endpoint is live and ready to use",
  },
];

export function DeploymentStatus({
  endpointId,
  onComplete,
  onError,
}: DeploymentStatusProps) {
  const [currentStep, setCurrentStep] =
    useState<DeploymentStep>("INITIALIZING");
  const [stepStatuses, setStepStatuses] = useState<
    Map<DeploymentStep, DeploymentStepStatus>
  >(new Map());
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpointId) return;

    // Poll for deployment status
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/endpoints/${endpointId}/status`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch deployment status");
        }

        const data = await response.json();

        // Update current step
        setCurrentStep(data.currentStep);

        // Update step statuses
        if (data.steps) {
          const newStatuses = new Map<DeploymentStep, DeploymentStepStatus>();
          data.steps.forEach((step: DeploymentStepStatus) => {
            newStatuses.set(step.step, step);
          });
          setStepStatuses(newStatuses);
        }

        // Update logs
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }

        // Check if completed or failed
        if (data.currentStep === "COMPLETED") {
          clearInterval(pollInterval);
          onComplete?.();
        } else if (data.currentStep === "FAILED") {
          clearInterval(pollInterval);
          setError(data.error || "Deployment failed");
          onError?.(data.error || "Deployment failed");
        }
      } catch (err) {
        console.error("Error polling deployment status:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        clearInterval(pollInterval);
        onError?.(err instanceof Error ? err.message : "Unknown error");
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [endpointId, onComplete, onError]);

  const getStepIcon = (
    step: DeploymentStep,
    stepIndex: number,
    currentStepIndex: number
  ) => {
    const status = stepStatuses.get(step);

    if (status?.status === "completed") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }

    if (status?.status === "failed") {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }

    if (status?.status === "in_progress" || status?.status === "in-progress") {
      return <Spinner className="h-5 w-5 text-blue-500" />;
    }

    return (
      <Circle
        className={cn(
          "h-5 w-5",
          stepIndex < currentStepIndex
            ? "text-muted-foreground"
            : "text-muted-foreground/50"
        )}
      />
    );
  };

  const getCurrentStepIndex = () => {
    return DEPLOYMENT_STEPS.findIndex((s) => s.key === currentStep);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Deployment Progress</CardTitle>
          <CardDescription>
            {currentStep === "COMPLETED"
              ? "Your model has been successfully deployed"
              : currentStep === "FAILED"
                ? "Deployment encountered an error"
                : "Deploying your model to the cloud..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {DEPLOYMENT_STEPS.filter((s) => s.key !== "FAILED").map(
              (step, index) => {
                const currentStepIndex = getCurrentStepIndex();
                const status = stepStatuses.get(step.key);

                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {getStepIcon(step.key, index, currentStepIndex)}
                      {index < DEPLOYMENT_STEPS.length - 2 && (
                        <div
                          className={cn(
                            "w-0.5 h-12 mt-2",
                            index < currentStepIndex
                              ? "bg-green-500"
                              : "bg-muted"
                          )}
                        />
                      )}
                    </div>

                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4
                            className={cn(
                              "font-medium",
                              status?.status === "completed" &&
                                "text-green-600",
                              status?.status === "failed" && "text-red-600",
                              status?.status === "in-progress" &&
                                "text-blue-600",
                              !status && "text-muted-foreground"
                            )}
                          >
                            {step.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {status?.message || step.description}
                          </p>
                          {status?.details && (
                            <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted p-2 rounded">
                              {status.details}
                            </p>
                          )}
                        </div>
                        {status?.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(status.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Build Logs</CardTitle>
            <CardDescription>Real-time deployment logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
