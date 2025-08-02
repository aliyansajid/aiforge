"use client";

import z from "zod";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { personalInfoSchema } from "@/schemas/auth";
import { setupPassword } from "@/actions/account";

const formSchema = personalInfoSchema.pick({ password: true });

const PasswordSetupDialog = () => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("password", values.password);

        const response = await setupPassword(formData);

        if (response.success) {
          setOpen(false);
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
          text="Set up"
          size="sm"
          className="rounded-full"
        />
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <DialogHeader>
              <DialogTitle>Set up password</DialogTitle>
              <DialogDescription>
                Create a password to enable email and password sign-in for your
                account.
              </DialogDescription>
            </DialogHeader>

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              name="password"
              inputType="password"
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
                text="Set up password"
                isLoading={isPending}
                type="submit"
              />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordSetupDialog;
