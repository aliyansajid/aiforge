"use client";

import z from "zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/ui/components/form";
import { updatePassword } from "@/actions/security";
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

const ChangePasswordDialog = () => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("oldPassword", values.oldPassword);
        formData.append("newPassword", values.newPassword);

        const response = await updatePassword(formData);

        if (response.success) {
          setOpen(false);
          form.reset();
          toast.success(response.message);
        } else {
          toast.error(response.error);
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
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

            <div className="flex gap-4">
              <div className="flex-1">
                <CustomFormField
                  control={form.control}
                  fieldType={FormFieldType.INPUT}
                  inputType="password"
                  name="oldPassword"
                  label="Old password"
                  placeholder="********"
                />
              </div>
              <div className="flex-1">
                <CustomFormField
                  control={form.control}
                  fieldType={FormFieldType.INPUT}
                  inputType="password"
                  name="newPassword"
                  label="New password"
                  placeholder="********"
                />
              </div>
            </div>

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
