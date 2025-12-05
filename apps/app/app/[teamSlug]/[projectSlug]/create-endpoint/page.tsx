"use client";

import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { endpointSchema } from "@/schema";
import { createEndpoint } from "@/lib/api-client";
import { getEndpointContext } from "@/app/actions/endpoint-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/src/components/custom-form-field";
import { SelectItem } from "@repo/ui/components/select";
import { Separator } from "@repo/ui/components/separator";
import { Bot, Brain } from "lucide-react";
import { toast } from "sonner";
import { DeploymentProgress } from "@/components/deployment-progress";
import { Spinner } from "@repo/ui/src/components/spinner";
import { ModelConfigGenerator } from "@/components/model-config-generator";

const CreateEndpoint = () => {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deploymentStarted, setDeploymentStarted] = useState(false);
  const [endpointId, setEndpointId] = useState<string | null>(null);

  const [modelFileName, setModelFileName] = useState<string>("");
  const [requirementsFileName, setRequirementsFileName] = useState<string>("");
  const [inferenceFileName, setInferenceFileName] = useState<string>("");
  const [deploymentType, setDeploymentType] = useState<
    "single" | "zip" | "git"
  >("single");

  const form = useForm<z.infer<typeof endpointSchema>>({
    resolver: zodResolver(endpointSchema),
    defaultValues: {
      name: "",
      description: "",
      accessType: "PRIVATE",
      inputType: "JSON",
      pricePerRequest: "",
      pricePerMonth: "",
      deploymentType: "SINGLE_FILE",
      gitRepoUrl: "",
      gitBranch: "",
      gitCommit: "",
      gitAccessToken: "",
    },
  });

  const accessType = form.watch("accessType");
  const modelFile = form.watch("modelFile");
  const requirementsFile = form.watch("requirementsFile");
  const inferenceFile = form.watch("inferenceFile");

  useEffect(() => {
    if (modelFile instanceof File) {
      setModelFileName(modelFile.name);
    }
  }, [modelFile]);

  useEffect(() => {
    if (requirementsFile instanceof File) {
      setRequirementsFileName(requirementsFile.name);
    }
  }, [requirementsFile]);

  useEffect(() => {
    if (inferenceFile instanceof File) {
      setInferenceFileName(inferenceFile.name);
    }
  }, [inferenceFile]);

  async function onSubmit(data: z.infer<typeof endpointSchema>) {
    setIsSubmitting(true);
    setDeploymentStarted(true); // Start showing deployment status immediately

    try {
      // Get project and user IDs from server
      const contextResult = await getEndpointContext(
        params.projectSlug as string,
        params.teamSlug as string
      );

      if (!contextResult.success || !contextResult.data) {
        toast.error(contextResult.message || "Failed to get project context");
        setDeploymentStarted(false);
        setIsSubmitting(false);
        return;
      }

      const { projectId, userId } = contextResult.data;

      // Call API with deployment type-specific data
      const result = await createEndpoint({
        name: data.name,
        description: data.description,
        projectId,
        userId,
        accessType: data.accessType,
        inputType: data.inputType,
        deploymentType: data.deploymentType,
        // Single file deployment
        modelFile: data.modelFile,
        requirementsFile: data.requirementsFile,
        inferenceFile: data.inferenceFile,
        // ZIP deployment
        archiveFile: data.archiveFile,
        // Git deployment
        gitRepoUrl: data.gitRepoUrl,
        gitBranch: data.gitBranch,
        gitCommit: data.gitCommit,
        gitAccessToken: data.gitAccessToken,
        // Pricing
        pricePerRequest: data.pricePerRequest,
        pricePerMonth: data.pricePerMonth,
      });

      setEndpointId(result.endpointId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create endpoint. Please try again."
      );
      setDeploymentStarted(false);
      setIsSubmitting(false);
    }
  }

  const handleDeploymentComplete = (data: {
    serviceUrl?: string;
    apiKey?: string;
  }) => {
    toast.success("Deployment completed successfully!", {
      duration: 5000,
    });
    setTimeout(() => {
      router.push(`/${params.teamSlug}/${params.projectSlug}`);
    }, 2000);
  };

  const handleDeploymentError = (error: string) => {
    toast.error(`Deployment failed: ${error}`);
    setIsSubmitting(false);
  };

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col gap-6">
        <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-muted">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Deploy New Model</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Upload your trained model and get an API endpoint in minutes
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Give your endpoint a name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <CustomFormField
                control={form.control}
                fieldType={FormFieldType.INPUT}
                inputType="text"
                name="name"
                label="Endpoint Name"
                placeholder="e.g. Image Classifier v1"
                disabled={isSubmitting}
              />

              <CustomFormField
                control={form.control}
                fieldType={FormFieldType.TEXTAREA}
                name="description"
                label="Description (Optional)"
                placeholder="Describe what this model does, its use cases, and any important details..."
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Model</CardTitle>
              <CardDescription>
                Choose how you want to deploy your model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={deploymentType === "single" ? "default" : "outline"}
                  onClick={() => {
                    setDeploymentType("single");
                    form.setValue("deploymentType", "SINGLE_FILE");
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Single Files
                </Button>
                <Button
                  type="button"
                  variant={deploymentType === "zip" ? "default" : "outline"}
                  onClick={() => {
                    setDeploymentType("zip");
                    form.setValue("deploymentType", "ZIP_ARCHIVE");
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  ZIP Archive
                </Button>
                <Button
                  type="button"
                  variant={deploymentType === "git" ? "default" : "outline"}
                  onClick={() => {
                    setDeploymentType("git");
                    form.setValue("deploymentType", "GIT_REPOSITORY");
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  GitHub Repo
                </Button>
              </div>

              {deploymentType === "single" && (
                <div className="space-y-6">
                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    inputType="file"
                    name="modelFile"
                    label="Model File"
                    accept=".h5,.keras,.pt,.pth,.onnx,.pkl,.joblib"
                    disabled={isSubmitting}
                  />

                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    inputType="file"
                    name="requirementsFile"
                    label="requirements.txt"
                    accept=".txt"
                    disabled={isSubmitting}
                  />

                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    inputType="file"
                    name="inferenceFile"
                    label="inference.py (Optional)"
                    accept=".py"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {deploymentType === "zip" && (
                <div className="space-y-6">
                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    inputType="file"
                    name="archiveFile"
                    label="ZIP Archive"
                    accept=".zip"
                    disabled={isSubmitting}
                  />

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border-2 border-blue-300 dark:border-blue-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col gap-1">
                          <p className="font-bold text-blue-900 dark:text-blue-100">
                            REQUIRED: model_config.json
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Your ZIP must include a&nbsp;
                            <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">
                              model_config.json
                            </code>
                            &nbsp; file at the root. This tells us how to load
                            and use your model.
                          </p>
                        </div>

                        <div className="pt-2">
                          <ModelConfigGenerator />
                        </div>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-100 hover:underline">
                            Show example ZIP structure
                          </summary>
                          <pre className="mt-2 bg-blue-100 dark:bg-blue-900 p-3 rounded text-xs font-mono overflow-x-auto">
                            {`my-model.zip/
├── model_config.json  ← Required!
├── inference.py       ← Your entry point
├── model.pkl          ← Your model
├── vectorizer.pkl     ← Auxiliary files (optional)
├── requirements.txt   ← Strongly recommended
└── utils/             ← Support code (optional)
    └── helpers.py`}
                          </pre>
                        </details>

                        <details>
                          <summary className="cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-100 hover:underline">
                            What should model_config.json contain?
                          </summary>
                          <div className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-2">
                            <p className="font-medium">Required fields:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                              <li>
                                <strong>entry_point:</strong> Your Python file
                                (e.g., "inference.py")
                              </li>
                              <li>
                                <strong>model_file:</strong> Your model file
                                (e.g., "model.pkl")
                              </li>
                              <li>
                                <strong>framework:</strong> "sklearn",
                                "pytorch", "tensorflow", "onnx", or "custom"
                              </li>
                              <li>
                                <strong>load:</strong> Function to load your
                                model
                              </li>
                              <li>
                                <strong>predict:</strong> Function to make
                                predictions
                              </li>
                            </ul>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                    <p className="font-medium mb-2">Best Practices:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>
                        <strong>Always include requirements.txt</strong> with
                        exact versions from training
                      </li>
                      <li>Keep ZIP under 2GB for faster deployments</li>
                      <li>Don't include virtual environments (venv/, env/)</li>
                      <li>
                        Remove unnecessary files (.git/, __pycache__/,
                        .DS_Store)
                      </li>
                      <li>Test your model_config.json matches your files</li>
                    </ul>
                  </div>
                </div>
              )}

              {deploymentType === "git" && (
                <div className="space-y-6">
                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    inputType="text"
                    name="gitRepoUrl"
                    label="Repository URL"
                    placeholder="e.g. https://github.com/username/repo"
                    disabled={isSubmitting}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <CustomFormField
                      control={form.control}
                      fieldType={FormFieldType.INPUT}
                      inputType="text"
                      name="gitBranch"
                      label="Branch (Optional)"
                      placeholder="e.g. main"
                      disabled={isSubmitting}
                    />

                    <CustomFormField
                      control={form.control}
                      fieldType={FormFieldType.INPUT}
                      inputType="text"
                      name="gitCommit"
                      label="Commit SHA (Optional)"
                      placeholder="e.g. abc123..."
                      disabled={isSubmitting}
                    />
                  </div>

                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    inputType="password"
                    name="gitAccessToken"
                    label="Access Token (for private repos)"
                    placeholder="e.g. ghp_xxxxx..."
                    disabled={isSubmitting}
                  />

                  <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                    <p className="font-medium mb-2">
                      Repository should contain:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Model file(s) in any directory</li>
                      <li>requirements.txt or setup.py</li>
                      <li>inference.py (optional)</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access Configuration</CardTitle>
              <CardDescription>
                Control who can access your endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <CustomFormField
                control={form.control}
                fieldType={FormFieldType.SELECT}
                name="accessType"
                label="Access Type"
                className="w-full"
                disabled={isSubmitting}
              >
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </CustomFormField>

              <CustomFormField
                control={form.control}
                fieldType={FormFieldType.SELECT}
                name="inputType"
                label="Input Type"
                className="w-full"
                disabled={isSubmitting}
              >
                <SelectItem value="JSON">JSON</SelectItem>
                <SelectItem value="IMAGE">Image</SelectItem>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="AUDIO">Audio</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="FILE">File</SelectItem>
              </CustomFormField>

              {accessType === "PAID" && (
                <>
                  <Separator />
                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    inputType="number"
                    name="pricePerRequest"
                    label="Price per Request ($)"
                    placeholder="e.g. 0.001"
                    disabled={isSubmitting}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Spinner /> : "Deploy"}
            </Button>
          </div>
        </form>
      </Form>

      {deploymentStarted && endpointId && (
        <DeploymentProgress
          endpointId={endpointId}
          onComplete={handleDeploymentComplete}
          onError={handleDeploymentError}
        />
      )}
      </div>
    </div>
  );
};

export default CreateEndpoint;
