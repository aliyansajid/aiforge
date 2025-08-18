"use client";

import z from "zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/ui/components/form";
import { updatePassword } from "@/actions/security-actions";
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
import { changePasswordSchema } from "@/schemas/auth";

const ChangePasswordDialog = () => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    },
  });

  const onSubmit = (values: z.infer<typeof changePasswordSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("oldPassword", values.oldPassword);
        formData.append("newPassword", values.newPassword);

        const response = await updatePassword(formData);

        if (response.success) {
          form.reset();
          setOpen(false);
          toast.success(response.message);
        } else {
          toast.error(
            response.error || "Unable to update password. Please try again."
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
          variant={ButtonVariant.OUTLINE}
          size="sm"
          text="Change password"
          className="rounded-full"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              inputType="password"
              name="oldPassword"
              label="Old password"
              placeholder="********"
            />

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              inputType="password"
              name="newPassword"
              label="New password"
              placeholder="********"
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
                variant={ButtonVariant.DEFAULT}
                text="Save"
                type="submit"
                isLoading={isPending}
              />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
