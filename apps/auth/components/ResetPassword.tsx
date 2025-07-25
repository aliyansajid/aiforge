"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { useState } from "react";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
});

const ResetPasswordForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      console.log(values);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Create a New Password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter a new password below to regain access to your account
          </p>
        </div>

        <CustomFormField
          control={form.control}
          fieldType={FormFieldType.INPUT}
          inputType="password"
          name="password"
          label="Password"
          placeholder="********"
        />

        <CustomFormField
          control={form.control}
          fieldType={FormFieldType.INPUT}
          inputType="password"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="********"
        />

        <div className="grid gap-3">
          <CustomButton
            variant={ButtonVariant.DEFAULT}
            text="Update Password"
            isLoading={isLoading}
          />
          <CustomButton
            variant={ButtonVariant.OUTLINE}
            text="Back to Login"
            type="button"
            onClick={() => router.push("/login")}
          />
        </div>
      </form>
    </Form>
  );
};

export default ResetPasswordForm;
