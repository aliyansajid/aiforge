"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Badge } from "@repo/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Spinner } from "@repo/ui/components/spinner";
import { Brain, Copy, Play, AlertCircle, Code, Zap, Key, Activity } from "lucide-react";
import { toast } from "sonner";
import { DynamicInput } from "@/components/dynamic-input";
import { MetricsDashboard } from "@/components/metrics/metrics-dashboard";
import {
  getEndpointBySlug,
  type EndpointDetails,
} from "@/app/actions/endpoint-actions";

export default function EndpointPlaygroundPage() {
  const params = useParams();
  const [endpoint, setEndpoint] = useState<EndpointDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [inputData, setInputData] = useState("");
  const [fileData, setFileData] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEndpoint();
  }, []);

  const loadEndpoint = async () => {
    const result = await getEndpointBySlug(
      params.teamSlug as string,
      params.projectSlug as string,
      params.endpointSlug as string
    );

    if (result.success && result.data) {
      setEndpoint(result.data);
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const testEndpoint = async () => {
    if (!endpoint?.serviceUrl) {
      setError("Service URL not available. Endpoint may not be deployed yet.");
      return;
    }

    setTesting(true);
    setPrediction(null);
    setError(null);

    try {
      let requestBody: any;

      // Format input based on type
      switch (endpoint.inputType) {
        case "JSON":
          if (!inputData.trim()) {
            throw new Error("Please enter JSON input");
          }
          requestBody = { input: JSON.parse(inputData) };
          break;

        case "IMAGE":
          if (!inputData) {
            throw new Error("Please select an image");
          }
          const base64Image = inputData.includes(",")
            ? inputData.split(",")[1]
            : inputData;
          requestBody = { input: base64Image, type: "image" };
          break;

        case "TEXT":
          if (!inputData.trim()) {
            throw new Error("Please enter text input");
          }
          requestBody = { input: inputData, type: "text" };
          break;

        case "AUDIO":
        case "VIDEO":
        case "FILE":
          if (!inputData) {
            throw new Error("Please select a file");
          }
          const base64File = inputData.includes(",")
            ? inputData.split(",")[1]
            : inputData;
          requestBody = {
            input: base64File,
            type: endpoint.inputType.toLowerCase(),
          };
          break;

        default:
          throw new Error(`Unsupported input type: ${endpoint.inputType}`);
      }

      const response = await fetch(`${endpoint.serviceUrl}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": endpoint.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Prediction failed");
      }

      const data = await response.json();
      setPrediction(data);
      toast.success("Prediction successful!");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to get prediction";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const copyCurlCommand = () => {
    if (!endpoint?.serviceUrl) return;

    const sampleInput = inputData.trim() || "[[1.0, 2.0, 3.0]]";

    const curlCommand = `curl -X POST '${endpoint.serviceUrl}/predict' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: ${endpoint.apiKey}' \\
  -d '{"input": ${sampleInput}}'`;

    navigator.clipboard.writeText(curlCommand);
    toast.success("Curl command copied to clipboard!");
  };

  const copyApiKey = () => {
    if (!endpoint) return;
    navigator.clipboard.writeText(endpoint.apiKey);
    toast.success("API key copied to clipboard!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DEPLOYED":
        return "bg-green-500";
      case "BUILDING":
      case "DEPLOYING":
        return "bg-blue-500";
      case "FAILED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Endpoint not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-muted">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{endpoint.name}</h1>
          {endpoint.description && (
            <p className="text-muted-foreground text-sm text-balance">
              {endpoint.description}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(endpoint.status)}>
              {endpoint.status}
            </Badge>
            <Badge variant="outline">{endpoint.framework}</Badge>
            <Badge variant="outline">{endpoint.accessType}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="playground">
        <TabsList>
          <TabsTrigger value="playground">
            <Play className="h-4 w-4" />
            Playground
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <Activity className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="docs">
            <Code className="h-4 w-4" />
            API Docs
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Key className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playground">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Your Model</CardTitle>
                <CardDescription>
                  Enter input data and get predictions instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DynamicInput
                  inputType={endpoint.inputType}
                  value={inputData}
                  onChange={setInputData}
                  fileData={fileData}
                  onFileChange={setFileData}
                />

                <Button
                  onClick={testEndpoint}
                  disabled={
                    testing ||
                    endpoint.status !== "DEPLOYED" ||
                    !endpoint.serviceUrl
                  }
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <Spinner />
                      Getting Prediction...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Prediction
                    </>
                  )}
                </Button>

                {endpoint.status !== "DEPLOYED" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Endpoint must be deployed before testing
                    </AlertDescription>
                  </Alert>
                )}

                {!endpoint.serviceUrl && endpoint.status === "DEPLOYED" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Service URL not available yet
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prediction Result</CardTitle>
                <CardDescription>
                  Model response will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prediction && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Prediction</Label>
                      <div className="p-4 rounded-md bg-muted font-mono text-sm">
                        {JSON.stringify(prediction.prediction, null, 2)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Framework
                        </Label>
                        <p className="font-medium">{prediction.framework}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Inference Time
                        </Label>
                        <p className="font-medium">
                          {prediction.metadata?.inference_time_ms?.toFixed(2)}{" "}
                          ms
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Full Response
                      </Label>
                      <pre className="p-4 rounded-md bg-muted text-xs overflow-auto max-h-[200px]">
                        {JSON.stringify(prediction, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!prediction && !error && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Run a prediction to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsDashboard />
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                How to integrate this endpoint into your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={endpoint.serviceUrl || "Not deployed yet"}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (endpoint.serviceUrl) {
                        navigator.clipboard.writeText(endpoint.serviceUrl);
                        toast.success("URL copied!");
                      }
                    }}
                    disabled={!endpoint.serviceUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {endpoint.serviceUrl && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Curl Command</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyCurlCommand}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <pre className="p-4 rounded-md bg-muted text-xs overflow-auto">
                      {`curl -X POST '${endpoint.serviceUrl}/predict' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: ${endpoint.apiKey}' \\
  -d '{"input": [[1.0, 2.0, 3.0]]}'`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <Label>Python Example</Label>
                    <pre className="p-4 rounded-md bg-muted text-xs overflow-auto">
                      {`import requests

url = "${endpoint.serviceUrl}/predict"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${endpoint.apiKey}"
}
data = {"input": [[1.0, 2.0, 3.0]]}

response = requests.post(url, json=data, headers=headers)
result = response.json()
print(result["prediction"])`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <Label>JavaScript Example</Label>
                    <pre className="p-4 rounded-md bg-muted text-xs overflow-auto">
                      {`const response = await fetch('${endpoint.serviceUrl}/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${endpoint.apiKey}'
  },
  body: JSON.stringify({ input: [[1.0, 2.0, 3.0]] })
});

const result = await response.json();
console.log(result.prediction);`}
                    </pre>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Settings</CardTitle>
              <CardDescription>
                Configuration and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={endpoint.apiKey}
                    readOnly
                    type="password"
                    className="font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep this key secret. Anyone with this key can access your
                  endpoint.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Framework
                  </Label>
                  <p className="font-medium">{endpoint.framework}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Access Type
                  </Label>
                  <p className="font-medium">{endpoint.accessType}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Deployed At
                  </Label>
                  <p className="font-medium">
                    {endpoint.deployedAt
                      ? new Date(endpoint.deployedAt).toLocaleString()
                      : "Not deployed yet"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Created At
                  </Label>
                  <p className="font-medium">
                    {new Date(endpoint.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
