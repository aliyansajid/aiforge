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
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emailSchema } from "@/schemas/auth";
import { sendPasswordResetOtp } from "@/actions/auth";
import { toast } from "sonner";

const ForgotPasswordForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form with schema validation using Zod
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  /**
   * Handle form submission for sending password reset OTP
   * On success: redirects user to the OTP verification screen
   */
  const onSubmit = (values: z.infer<typeof emailSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", values.email);

        const response = await sendPasswordResetOtp(formData);

        if (response.success) {
          router.replace(`/reset-password?email=${values.email}`);
        } else {
          toast.error(response.error || "Failed to send OTP");
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Trouble Logging In?</h1>
          <p className="text-muted-foreground text-sm text-balance">
            No worries — enter your registered email to receive reset
            instructions
          </p>
        </div>

        <CustomFormField
          control={form.control}
          fieldType={FormFieldType.INPUT}
          inputType="email"
          name="email"
          label="Email"
          placeholder="m@example.com"
        />

        <div className="grid gap-2">
          <CustomButton
            variant={ButtonVariant.DEFAULT}
            text="Send Reset Link"
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

export default ForgotPasswordForm;
