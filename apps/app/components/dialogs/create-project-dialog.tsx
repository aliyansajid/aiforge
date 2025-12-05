"use client";

import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Form } from "@repo/ui/components/form";
import { createProject } from "@/app/actions/project-actions";
import { toast } from "sonner";
import { projectSchema } from "@/schema";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/src/components/custom-form-field";
import { Spinner } from "@repo/ui/src/components/spinner";
import { CreateProjectDialogProps } from "@/types";

export function CreateProjectDialog({
  open,
  onOpenChange,
  teamId,
}: CreateProjectDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(data: z.infer<typeof projectSchema>) {
    const formData = new FormData();
    formData.append("name", data.name.trim());

    startTransition(async () => {
      try {
        const result = await createProject(teamId, formData);

        if (result.success) {
          toast.success(result.message);
          form.reset();
          onOpenChange(false);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error((error as Error).message || "Failed to create project.");
      }
    });
  }

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Add a new project to organize your AI models and deployments.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              name="name"
              label="Name"
              placeholder="e.g. My AI Project"
              disabled={isPending}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner /> : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
