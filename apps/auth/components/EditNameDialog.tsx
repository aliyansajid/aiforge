"use client";

import z from "zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@repo/ui/components/form";
import { personalInfoSchema } from "@/schemas/auth";
import { updateName } from "@/actions/account";
import { toast } from "sonner";
import { useSession } from "@repo/auth";
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

const formSchema = personalInfoSchema.pick({
  firstName: true,
  lastName: true,
});

interface EditNameDialogProps {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
}

const EditNameDialog = ({ firstName, lastName }: EditNameDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { update } = useSession();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: firstName ?? "",
      lastName: lastName ?? "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("firstName", values.firstName);
        formData.append("lastName", values.lastName);

        const response = await updateName(formData);

        if (response.success) {
          setOpen(false);
          toast.success(response.message);
          // Update the session with new name
          await update({
            firstName: values.firstName,
            lastName: values.lastName,
            name: `${values.firstName} ${values.lastName}`,
          });
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
          text="Edit name"
          size="sm"
          className="rounded-full"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Edit name</DialogTitle>
            </DialogHeader>

            <div className="flex gap-4">
              <div className="flex-1">
                <CustomFormField
                  control={form.control}
                  fieldType={FormFieldType.INPUT}
                  inputType="text"
                  name="firstName"
                  label="First Name"
                  placeholder={firstName ?? ""}
                />
              </div>
              <div className="flex-1">
                <CustomFormField
                  control={form.control}
                  fieldType={FormFieldType.INPUT}
                  inputType="text"
                  name="lastName"
                  label="Last Name"
                  placeholder={lastName ?? ""}
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

export default EditNameDialog;
