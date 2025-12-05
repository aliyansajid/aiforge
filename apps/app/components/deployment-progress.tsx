"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Spinner } from "@repo/ui/components/spinner";
import {
  CheckCircle2,
  Circle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

type DeploymentStatus =
  | "UPLOADING"
  | "BUILDING"
  | "DEPLOYING"
  | "DEPLOYED"
  | "FAILED";

interface DeploymentStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

interface DeploymentProgressProps {
  endpointId: string;
  onComplete?: (data: { serviceUrl?: string; apiKey?: string }) => void;
  onError?: (error: string) => void;
}

export function DeploymentProgress({
  endpointId,
  onComplete,
  onError,
}: DeploymentProgressProps) {
  const [steps, setSteps] = useState<DeploymentStep[]>([
    {
      id: "uploading",
      title: "Uploading Files",
      description: "Uploading model files to Cloud Storage",
      status: "in_progress",
    },
    {
      id: "building",
      title: "Building Docker Image",
      description: "Installing dependencies and creating container",
      status: "pending",
    },
    {
      id: "deploying",
      title: "Deploying to Cloud Run",
      description: "Deploying your model endpoint",
      status: "pending",
    },
    {
      id: "completed",
      title: "Deployment Complete",
      description: "Your endpoint is live and ready to use",
      status: "pending",
    },
  ]);

  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const hasCompletedRef = useRef(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom only if user is already at bottom (inside container only)
  useEffect(() => {
    const container = logsContainerRef.current;
    if (!container) return;

    // Check if user is near bottom (within 100px)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    // Only auto-scroll if user is near bottom - scroll the container, not the page
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Poll deployment status
  useEffect(() => {
    if (!isPolling) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/endpoints/${endpointId}/status`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch deployment status");
        }

        const data = await response.json();
        const status: DeploymentStatus = data.status;

        // Update steps based on status
        updateStepsFromStatus(status);

        // Update logs - API returns logs as array
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }

        // Check if deployment completed or failed (only call callbacks once)
        if (status === "DEPLOYED" && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setIsPolling(false);
          updateStepsFromStatus("DEPLOYED");
          onComplete?.({
            serviceUrl: data.serviceUrl,
            apiKey: data.apiKey,
          });
        } else if (status === "FAILED" && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setIsPolling(false);
          const errorMsg = data.errorMessage || "Deployment failed";
          setError(errorMsg);
          updateStepsFromStatus("FAILED");
          onError?.(errorMsg);
        }
      } catch (err) {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          console.error("Error polling deployment status:", err);
          const errorMsg =
            err instanceof Error ? err.message : "Unknown error occurred";
          setError(errorMsg);
          setIsPolling(false);
          onError?.(errorMsg);
        }
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 3 seconds
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [endpointId, isPolling, onComplete, onError]);

  const updateStepsFromStatus = (status: DeploymentStatus) => {
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps];

      switch (status) {
        case "UPLOADING":
          if (newSteps[0]) newSteps[0].status = "in_progress";
          break;

        case "BUILDING":
          if (newSteps[0]) newSteps[0].status = "completed";
          if (newSteps[1]) newSteps[1].status = "in_progress";
          break;

        case "DEPLOYING":
          if (newSteps[0]) newSteps[0].status = "completed";
          if (newSteps[1]) newSteps[1].status = "completed";
          if (newSteps[2]) newSteps[2].status = "in_progress";
          break;

        case "DEPLOYED":
          if (newSteps[0]) newSteps[0].status = "completed";
          if (newSteps[1]) newSteps[1].status = "completed";
          if (newSteps[2]) newSteps[2].status = "completed";
          if (newSteps[3]) newSteps[3].status = "completed";
          break;

        case "FAILED":
          // Mark current step as failed
          const currentStepIndex = newSteps.findIndex(
            (s) => s.status === "in_progress"
          );
          if (currentStepIndex !== -1 && newSteps[currentStepIndex]) {
            newSteps[currentStepIndex]!.status = "failed";
          }
          break;
      }

      return newSteps;
    });
  };

  const getStepIcon = (step: DeploymentStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground/50" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deployment Progress</CardTitle>
              <CardDescription>
                Track your model deployment in real-time
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono text-muted-foreground">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-4">
                {/* Icon Column */}
                <div className="flex flex-col items-center">
                  {getStepIcon(step)}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "w-0.5 h-12 mt-2 transition-colors",
                        step.status === "completed"
                          ? "bg-green-500"
                          : "bg-muted"
                      )}
                    />
                  )}
                </div>

                {/* Content Column */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        "font-semibold text-sm",
                        step.status === "completed" && "text-green-600",
                        step.status === "in_progress" && "text-blue-600",
                        step.status === "failed" && "text-red-600",
                        step.status === "pending" && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </h4>
                    {step.status === "in_progress" && (
                      <Badge variant="secondary" className="text-xs">
                        In Progress
                      </Badge>
                    )}
                    {step.status === "completed" && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Complete
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logs Terminal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deployment Logs</CardTitle>
              <CardDescription>
                Real-time logs from the deployment process
              </CardDescription>
            </div>
            {isPolling && (
              <div className="flex items-center gap-2">
                <Spinner className="h-3 w-3" />
                <span className="text-xs text-muted-foreground">
                  Live updates
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={logsContainerRef}
            className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs"
          >
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-green-400/50">
                <div className="text-center">
                  <Spinner className="h-6 w-6 mx-auto mb-2" />
                  <p>Waiting for logs...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-green-400",
                      log.includes("ERROR") && "text-red-400",
                      log.includes("WARNING") && "text-yellow-400",
                      log.includes("✅") && "text-green-300",
                      log.includes("❌") && "text-red-400",
                      log.includes("🚀") && "text-blue-400"
                    )}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
