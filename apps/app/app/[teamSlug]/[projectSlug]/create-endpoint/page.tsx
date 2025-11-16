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
import { Brain } from "lucide-react";
import { toast } from "sonner";
import { DeploymentStatus } from "@/components/deployment-status";
import { Spinner } from "@repo/ui/src/components/spinner";

const CreateEndpoint = () => {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deploymentStarted, setDeploymentStarted] = useState(false);
  const [endpointId, setEndpointId] = useState<string | null>(null);

  const [modelFileName, setModelFileName] = useState<string>("");
  const [requirementsFileName, setRequirementsFileName] = useState<string>("");
  const [inferenceFileName, setInferenceFileName] = useState<string>("");

  const form = useForm<z.infer<typeof endpointSchema>>({
    resolver: zodResolver(endpointSchema),
    defaultValues: {
      name: "",
      description: "",
      accessType: "PRIVATE",
      inputType: "JSON",
      pricePerRequest: "",
      pricePerMonth: "",
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

    try {
      // Get project and user IDs from server
      const contextResult = await getEndpointContext(
        params.projectSlug as string,
        params.teamSlug as string
      );

      if (!contextResult.success || !contextResult.data) {
        toast.error(contextResult.message || "Failed to get project context");
        return;
      }

      const { projectId, userId } = contextResult.data;

      // Call Python API
      const result = await createEndpoint({
        name: data.name,
        description: data.description,
        projectId,
        userId,
        accessType: data.accessType,
        inputType: data.inputType,
        modelFile: data.modelFile,
        requirementsFile: data.requirementsFile,
        inferenceFile: data.inferenceFile,
        pricePerRequest: data.pricePerRequest,
        pricePerMonth: data.pricePerMonth,
      });

      setEndpointId(result.endpointId);
      setDeploymentStarted(true);

      toast.success("Deployment started! Monitoring progress...", {
        duration: 3000,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create endpoint. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  const handleDeploymentComplete = () => {
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

  if (deploymentStarted && endpointId) {
    return (
      <div className="flex flex-col gap-6 w-1/2 mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-muted">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Deploying Your Model</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Please wait while we deploy your model to the cloud
            </p>
          </div>
        </div>

        <DeploymentStatus
          endpointId={endpointId}
          onComplete={handleDeploymentComplete}
          onError={handleDeploymentError}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-1/2 mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-muted">
          <Brain className="h-8 w-8 text-primary" />
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
                placeholder="e.g., Image Classifier v1"
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
              <CardTitle>Upload Model Files</CardTitle>
              <CardDescription>
                Model file and requirements.txt are required. Inference file is
                optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    placeholder="0.001"
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
    </div>
  );
};

export default CreateEndpoint;
