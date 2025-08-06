"use client";

import z from "zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/ui/components/form";
import { toast } from "sonner";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { DialogDescription } from "@radix-ui/react-dialog";
import { signOut, useSession } from "@repo/auth";
import { deleteAccount } from "@/actions/data";

const DeletionConfirmationDialog = () => {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formSchema = z.object({
    email: z
      .email("Please enter a valid email address")
      .refine(
        (email) => email === session?.user?.email,
        "Email must match your account email"
      ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", values.email);

        const response = await deleteAccount(formData);

        if (response.success) {
          await signOut();
        } else {
          toast.error(
            response.error || "Unable to delete account. Please try again."
          );
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CustomButton
          variant={ButtonVariant.DESTRUCTIVE}
          text="Delete"
          size="sm"
          className="rounded-full"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                This action will delete all of your data associated with AIForge
                and you will be logged out. You can restore your data if you log
                in again within 30 days. After 30 days your data will be
                permanently deleted.
              </DialogDescription>
            </DialogHeader>

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              name="email"
              label={`Type your email (${session?.user?.email}) to confirm`}
              placeholder="Enter your email address"
            />

            <DialogFooter>
              <DialogClose asChild>
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Cancel"
                  disabled={isPending}
                />
              </DialogClose>
              <CustomButton
                variant={ButtonVariant.DESTRUCTIVE}
                text="Delete"
                type="submit"
                isLoading={isPending}
                disabled={!form.formState.isValid}
              />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeletionConfirmationDialog;
